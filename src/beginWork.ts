import { renderWithHooks } from './hooks'
import { reconcileChildFibers, mountChildFibers } from './reconciler'
import { ReactCurrentHostConfig, FunctionComponent, HostComponent, HostRoot, HostText } from './constants'
import type { Fiber } from './types'

function updateHostRoot(current: Fiber | null, workInProgress: Fiber): void {
  const newChildren = workInProgress.props.children
  reconcileChildFibers(current, workInProgress, newChildren)
}
function mountHostRoot(current: Fiber | null, workInProgress: Fiber): void {
  const newChildren = workInProgress.props.children
  mountChildFibers(current, workInProgress, newChildren)
}

function updateFunctionComponent(current: Fiber | null, workInProgress: Fiber): void {
  const newChildren = renderWithHooks(current, workInProgress, workInProgress.type as Function)
  reconcileChildFibers(current, workInProgress, newChildren)
}
function mountFunctionComponent(current: Fiber | null, workInProgress: Fiber): void {
  const children = renderWithHooks(current, workInProgress, workInProgress.type as Function)
  workInProgress.tag = FunctionComponent
  mountChildFibers(current, workInProgress, children)
}

function updateHost(current: Fiber | null, workInProgress: Fiber): void {
  if (workInProgress.stateNode == null) {
    workInProgress.stateNode = ReactCurrentHostConfig.current.createInstance(
      workInProgress.type as string,
      workInProgress.props,
      workInProgress,
    )
  }
  const newChildren = workInProgress.props.children
  reconcileChildFibers(current, workInProgress, newChildren)
}
function mountHost(current: Fiber | null, workInProgress: Fiber): void {
  if (workInProgress.stateNode == null) {
    workInProgress.stateNode = ReactCurrentHostConfig.current.createInstance(
      workInProgress.type as string,
      workInProgress.props,
      workInProgress,
    )
  }
  const newChildren = workInProgress.props.children
  mountChildFibers(current, workInProgress, newChildren)
}

function updateHostText(current: Fiber | null, workInProgress: Fiber): void {
  if (workInProgress.stateNode == null) {
    workInProgress.stateNode = ReactCurrentHostConfig.current.createTextInstance(
      workInProgress.props.text,
      workInProgress,
    )
  }
}
function mountHostText(current: Fiber | null, workInProgress: Fiber): void {
  if (workInProgress.stateNode == null) {
    workInProgress.stateNode = ReactCurrentHostConfig.current.createTextInstance(
      workInProgress.props.text,
      workInProgress,
    )
  }
}

export function beginWork(current: Fiber | null, workInProgress: Fiber): void {
  if (current != null) {
    switch (workInProgress.tag) {
      case HostRoot:
        return updateHostRoot(current, workInProgress)
      case FunctionComponent:
        return updateFunctionComponent(current, workInProgress)
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
        return mountFunctionComponent(current, workInProgress)
      case HostComponent:
        return mountHost(current, workInProgress)
      case HostText:
        return mountHostText(current, workInProgress)
      default:
        break
    }
  }
}
