import { FunctionComponent, HostComponent, HostRoot, HostText } from './constants'
import { commitRoot } from './commit'
import { renderWithHooks } from './hooks'
import { reconcileChildFibers, mountChildFibers } from './reconciler'
import type { ReactElement } from 'react'
import type { Fiber, HostConfig } from './types'

export const deletions: Fiber[] = []
export const ReactCurrentHostConfig = { current: null } as { current: HostConfig<any, any, any, any, any, any> | null }

let workInProgress: Fiber | null = null
let workInProgressRoot: Fiber | null = null
let nextUnitOfWork: Fiber | null = null
let currentRoot: Fiber | null = null

export const render = <Type, Props, Container, PublicInstance, Instance, TextInstance>(
  element: ReactElement,
  container: Container | null,
  config: HostConfig<Type, Props, Container, PublicInstance, Instance, TextInstance>,
): void => {
  const rootFiber: Fiber = {
    tag: HostRoot,
    stateNode: container,
    props: { children: [element] },
  }
  ReactCurrentHostConfig.current = config
  workInProgress = rootFiber
  scheduleRoot(rootFiber)
  schedule(bridge)
}

const scheduleRoot = (rootFiber: Fiber): void => {
  if (currentRoot?.alternate != null) {
    workInProgressRoot = currentRoot.alternate
    workInProgressRoot.alternate = currentRoot
    if (rootFiber != null) workInProgressRoot.props = rootFiber.props
  } else if (currentRoot != null) {
    if (rootFiber != null) {
      rootFiber.alternate = currentRoot
      workInProgressRoot = rootFiber
    } else {
      workInProgressRoot = {
        ...currentRoot,
        alternate: currentRoot,
      }
    }
  } else {
    workInProgressRoot = rootFiber
  }
  nextUnitOfWork = workInProgressRoot
}

export const scheduleUpdateOnFiber = (oldFiber: Fiber): void => {
  const newFiber = {
    ...oldFiber,
    alternate: oldFiber,
  }
  nextUnitOfWork = newFiber
  workInProgress = newFiber
  schedule(bridge)
}

const updateFunctionComponent = (current: Fiber, workInProgress: Fiber, Component: any): void => {
  const newChildren = renderWithHooks(current, workInProgress, Component)
  reconcileChildFibers(current, workInProgress, newChildren)
}

const updateHostRoot = (current: Fiber | null, workInProgress: Fiber): void => {
  const newChildren = workInProgress.props.children
  reconcileChildFibers(current, workInProgress, newChildren)
}

const updateHost = (current: Fiber | null, workInProgress: Fiber): void => {
  if (workInProgress.stateNode == null) {
    workInProgress.stateNode = ReactCurrentHostConfig.current!.createInstance(
      workInProgress.type as string,
      workInProgress.props,
      workInProgress,
    )
  }
  const newChildren = workInProgress.props.children
  reconcileChildFibers(current, workInProgress, newChildren)
}

const updateHostText = (currentFiber: Fiber | null, workInProgress: Fiber): void => {
  if (workInProgress.stateNode == null) {
    workInProgress.stateNode = ReactCurrentHostConfig.current!.createTextInstance(
      workInProgress.props.text,
      workInProgress,
    )
  }
}

const mountFunctionComponent = (current: Fiber | null, workInProgress: Fiber, Component: Function): void => {
  const children = renderWithHooks(current, workInProgress, Component)
  workInProgress.tag = FunctionComponent
  mountChildFibers(current, workInProgress, children)
}
const mountHostRoot = (current: Fiber | null, workInProgress: Fiber): void => {
  const newChildren = workInProgress.props.children
  mountChildFibers(current, workInProgress, newChildren)
}

const mountHost = (current: Fiber | null, workInProgress: Fiber): void => {
  if (workInProgress.stateNode == null) {
    workInProgress.stateNode = ReactCurrentHostConfig.current!.createInstance(
      workInProgress.type as string,
      workInProgress.props,
      workInProgress,
    )
  }
  const newChildren = workInProgress.props.children
  mountChildFibers(current, workInProgress, newChildren)
}

const mountHostText = (currentFiber: Fiber | null, workInProgress: Fiber): void => {
  if (workInProgress.stateNode == null) {
    workInProgress.stateNode = ReactCurrentHostConfig.current!.createTextInstance(
      workInProgress.props.text,
      workInProgress,
    )
  }
}

const beginWork = (current: Fiber, workInProgress: Fiber): void => {
  if (current != null) {
    switch (workInProgress.tag) {
      case HostRoot:
        return updateHostRoot(current, workInProgress)
      case FunctionComponent:
        return updateFunctionComponent(current, workInProgress, workInProgress.type)
      case HostComponent:
        return updateHost(current, workInProgress)
      case HostText:
        return updateHostText(current, workInProgress)
      default:
        break
    }
  } else {
    switch (workInProgress.tag) {
      case HostRoot:
        return mountHostRoot(current, workInProgress)
      case FunctionComponent:
        return mountFunctionComponent(current, workInProgress, workInProgress.type as Function)
      case HostComponent:
        return mountHost(current, workInProgress)
      case HostText:
        return mountHostText(current, workInProgress)
      default:
        break
    }
  }
}

const performUnitOfWork = <P>(unitOfWorkFiber: Fiber<P>): Fiber<P> | null => {
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

const bridge = (): void => {
  while (nextUnitOfWork != null && !shouldYield()) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }

  if (nextUnitOfWork != null) return schedule(bridge)

  if (nextUnitOfWork == null && workInProgressRoot != null) {
    commitRoot(workInProgressRoot, deletions)
    currentRoot = workInProgressRoot
    workInProgressRoot = null
    workInProgress = null
  }
  if (nextUnitOfWork == null && workInProgress != null) {
    commitRoot(workInProgress, deletions)
    workInProgress = null
  }
}

type TaskCallback = (...args: any[]) => any
interface Task {
  callback: TaskCallback | null
  fiber?: Fiber
}

const queue: Task[] = []
const threshold: number = 5
const transitions: TaskCallback[] = []
let deadline: number = 0

const startTransition = (cb: TaskCallback): void => {
  transitions.push(cb) && translate()
}

const shouldYield = (): boolean => performance.now() >= deadline

export const schedule = (callback: TaskCallback): void => {
  queue.push({ callback })
  startTransition(flush)
}

const task = (pending: boolean): Function => {
  const cb = (): void => transitions.splice(0, 1).forEach((c) => c())
  return () => (pending ? setTimeout(cb) : queueMicrotask(cb))
}

let translate = task(false)

const flush = (): void => {
  deadline = performance.now() + threshold
  let job = queue[0]
  while (job && !shouldYield()) {
    const { callback } = job
    job.callback = null
    const next = typeof callback === 'function' && callback()
    if (next) {
      job.callback = next
    } else {
      queue.shift()
    }
    job = queue[0]
  }
  job && (translate = task(shouldYield())) && startTransition(flush)
}
