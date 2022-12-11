import { commitRoot } from './commit'
import { beginWork } from './beginWork'
import { HostRoot, ReactCurrentHostConfig } from './constants'
import type { ReactElement } from 'react'
import type { Fiber, HostConfig } from './types'

const workQueue: Function[] = []
let pending: boolean = false

if (typeof window !== 'undefined') {
  // @ts-expect-error Safari polyfill https://caniuse.com/requestidlecallback
  window.requestIdleCallback ??= (callback: (deadline: IdleDeadline) => void) =>
    callback({ didTimeout: false, timeRemaining: () => Number.MAX_VALUE })
}

function flushQueue(deadline: IdleDeadline): void {
  pending = true
  while (deadline.timeRemaining() > 0 && workQueue.length > 0) {
    const work = workQueue.shift()
    work?.(deadline)
  }
  if (workQueue.length > 0) requestIdleCallback(flushQueue)
  else pending = false
}

export const startTransition = (work: Function): void => {
  workQueue.push(work)
  if (!pending) requestIdleCallback(flushQueue)
}

export const deletions: Fiber[] = []

let workInProgress: Fiber | null = null
let workInProgressRoot: Fiber | null = null
let nextUnitOfWork: Fiber | null = null
let currentRoot: Fiber | null = null

export const scheduleUpdateOnFiber = (oldFiber: Fiber): void => {
  const newFiber = {
    ...oldFiber,
    alternate: oldFiber,
  }
  nextUnitOfWork = newFiber
  workInProgress = newFiber
  startTransition(bridge)
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

const bridge = (deadline: IdleDeadline): void => {
  while (nextUnitOfWork != null && deadline.timeRemaining() > 0) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }

  if (nextUnitOfWork != null) return startTransition(bridge)

  if (workInProgressRoot != null) {
    commitRoot(workInProgressRoot, deletions)
    currentRoot = workInProgressRoot
    workInProgressRoot = null
    workInProgress = null
  }
  if (workInProgress != null) {
    commitRoot(workInProgress, deletions)
    workInProgress = null
  }
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
  startTransition(bridge)
}
