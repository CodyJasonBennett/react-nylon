import { commitRoot } from './commit'
import { beginWork } from './beginWork'
import { HostRoot, ReactCurrentRoot, ReactCurrentHostConfig } from './constants'
import type { Fiber, HostConfig, Root } from './types'

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
  if (workQueue.length > 0) requestIdleCallback(flushQueue)
  else pending = false
}

export function startTransition(work: Function): void {
  workQueue.push(work)
  if (!pending) requestIdleCallback(flushQueue)
}

export const deletions: Fiber[] = []

let workInProgress: Fiber | null = null
let nextUnitOfWork: Fiber | null = null

export function scheduleUpdateOnFiber(oldFiber: Fiber): void {
  const newFiber = {
    ...oldFiber,
    alternate: oldFiber,
  }
  nextUnitOfWork = newFiber
  workInProgress = newFiber
  startTransition(bridge)
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
const configs = new WeakMap<any, HostConfig<any, any, any, any, any, any, any, any>>()

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

export function createRoot<Type, Props, Container, Instance, TextInstance, PublicInstance, HostContext, UpdatePayload>(
  container: Container | null,
  config: HostConfig<Type, Props, Container, Instance, TextInstance, PublicInstance, HostContext, UpdatePayload>,
): Root {
  configs.set(container, config)
  let rootFiber: Fiber | null = null

  return {
    render(element) {
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
    },
    unmount() {
      this.render(null)
      rootFiber = null
    },
  }
}
