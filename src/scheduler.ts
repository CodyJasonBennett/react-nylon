import type { ReactNode, ReactPortal } from 'react'
import { commitRoot } from './commit'
import {
  ReactCurrentRoot,
  ReactCurrentHostConfig,
  FunctionComponent,
  HostComponent,
  HostText,
  HostRoot,
} from './constants'
import type { Fiber, HostConfig } from './types'
import { renderWithHooks } from './hooks'
import { mountChildFibers, reconcileChildFibers } from './reconciler'

export const promises: Promise<any>[] = []
const promise: React.MutableRefObject<Promise<any> & { resolve?: Function }> = { current: null! }

export async function act<T = any>(cb: () => Promise<T>): Promise<T> {
  let resolve: Function | undefined
  promise.current = new Promise((res) => (resolve = res))
  promise.current.resolve = resolve

  const value = await cb()

  await promise.current

  return value
}

const workQueue: Function[] = []
let pending: boolean = false

// @ts-expect-error Safari polyfill https://caniuse.com/requestidlecallback
globalThis.requestIdleCallback ??= (callback: (deadline: IdleDeadline) => void) =>
  callback({ didTimeout: false, timeRemaining: () => Number.MAX_VALUE })

function flushQueue(deadline: IdleDeadline): void {
  pending = true
  while (deadline.timeRemaining() > 0 && workQueue.length > 0) {
    const work = workQueue.shift()
    work?.(deadline)
  }
  if (workQueue.length > 0) {
    requestIdleCallback(flushQueue)
  } else {
    pending = false
    if (promises.length === 0 && promise.current?.resolve) {
      promise.current.resolve()
      promise.current.resolve = undefined
    }
  }
}

export function startTransition(work: Function): void {
  workQueue.push(work)
  if (!pending) requestIdleCallback(flushQueue)
}

export const deletions: Fiber[] = []

let workInProgress: Fiber | null = null
let nextUnitOfWork: Fiber | null = null

export function scheduleUpdateOnFiber(oldFiber: Fiber): void {
  startTransition((deadline: IdleDeadline) => {
    const newFiber = {
      ...oldFiber,
      alternate: oldFiber,
    }
    nextUnitOfWork = newFiber
    workInProgress = newFiber

    bridge(deadline)
  })
}

function beginWork(current: Fiber | null, workInProgress: Fiber): void {
  if (workInProgress.tag === HostComponent) {
    workInProgress.stateNode ??= ReactCurrentHostConfig.current.createInstance(
      workInProgress.type as string,
      workInProgress.props,
      ReactCurrentRoot.current.stateNode,
      null,
      workInProgress,
    )
  } else if (workInProgress.tag === HostText) {
    workInProgress.stateNode ??= ReactCurrentHostConfig.current.createTextInstance(
      workInProgress.props.text,
      ReactCurrentRoot.current.stateNode,
      null,
      workInProgress,
    )
  }

  const children =
    workInProgress.tag === FunctionComponent
      ? renderWithHooks(current, workInProgress, workInProgress.type as Function)
      : workInProgress.props.children

  if (current == null) mountChildFibers(current, workInProgress, children)
  else reconcileChildFibers(current, workInProgress, children)
}

function performUnitOfWork<P>(unitOfWorkFiber: Fiber<P>): Fiber<P> | null {
  beginWork(unitOfWorkFiber.alternate!, unitOfWorkFiber)
  if (unitOfWorkFiber.child != null) {
    return unitOfWorkFiber.child
  }

  while (unitOfWorkFiber != null) {
    if (unitOfWorkFiber.sibling != null) {
      return unitOfWorkFiber.sibling
    }
    unitOfWorkFiber = unitOfWorkFiber.return!
  }
  return null
}

const workInProgressRoots: Fiber[] = []
const configs = new WeakMap<any, HostConfig<any, any, any, any, any, any, any, any, any, any, any, any, any>>()

function bridge(deadline: IdleDeadline): void {
  while (nextUnitOfWork != null && deadline.timeRemaining() > 0) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }

  if (nextUnitOfWork != null) return startTransition(bridge)

  if (workInProgress != null) {
    commitRoot(workInProgress, deletions)
    workInProgress = null
  } else {
    const workInProgressRoot = workInProgressRoots.shift()
    ReactCurrentRoot.current = workInProgressRoot!
    if (workInProgressRoot == null) return

    ReactCurrentHostConfig.current = configs.get(workInProgressRoot.stateNode)!
    nextUnitOfWork = workInProgressRoot
    workInProgress = workInProgressRoot

    return startTransition(bridge)
  }
}

export function Reconciler<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
  ChildSet,
  TimeoutHandle,
  NoTimeout,
>(
  config: HostConfig<
    Type,
    Props,
    Container,
    Instance,
    TextInstance,
    SuspenseInstance,
    HydratableInstance,
    PublicInstance,
    HostContext,
    UpdatePayload,
    ChildSet,
    TimeoutHandle,
    NoTimeout
  >,
) {
  let rootFiber: Fiber | null = null

  return {
    createContainer(
      containerInfo: Container,
      tag: 0 | 1,
      hydrationCallbacks: null | any,
      isStrictMode: boolean,
      concurrentUpdatesByDefaultOverride: null | boolean,
      identifierPrefix: string,
      onRecoverableError: (error: any) => void,
      transitionCallbacks: null | any,
    ): Container {
      rootFiber = null
      return containerInfo
    },
    updateContainer(
      element: ReactNode,
      container: Container,
      parentComponent: React.Component<any, any>,
      callback?: Function,
    ): void {
      configs.set(container, config)

      const currentRoot: Fiber = {
        tag: HostRoot,
        stateNode: container,
        props: { children: [element] },
      }

      if (rootFiber?.alternate != null) {
        const previousRoot = rootFiber.alternate
        previousRoot.alternate = rootFiber
        previousRoot.props = currentRoot.props
        rootFiber = previousRoot
      } else {
        if (rootFiber != null) currentRoot.alternate = rootFiber
        rootFiber = currentRoot
      }

      workInProgressRoots.push(rootFiber)
      startTransition(bridge)

      // if (callback) startTransition(callback)
    },
    createPortal(
      children: ReactNode,
      containerInfo: any,
      // TODO: figure out the API for cross-renderer implementation.
      implementation?: any,
      key?: string | null,
    ): ReactPortal {
      return {
        $$typeof: Symbol.for('react.portal'),
        key: key == null ? null : '' + key,
        children,
        containerInfo,
        implementation,
      } as unknown as ReactPortal
    },
    injectIntoDevTools(devToolsConfig: {
      bundleType: 0 | 1
      version: string
      rendererPackageName: string
      // Note: this actually *does* depend on Fiber internal fields.
      // Used by "inspect clicked DOM element" in React DevTools.
      findFiberByHostInstance?: (instance: Instance | TextInstance) => Fiber | null
      rendererConfig?: any
    }): boolean {
      return false
    },
  } as unknown as any
}
