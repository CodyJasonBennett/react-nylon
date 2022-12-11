import { renderWithHooks } from './hooks'
import { reconcileChildFibers, mountChildFibers } from './reconciler'
import { ReactCurrentHostConfig, FunctionComponent, HostComponent, HostRoot, HostText } from './constants'
import type { Fiber } from './types'

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
    workInProgress.stateNode = ReactCurrentHostConfig.current.createInstance(
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
    workInProgress.stateNode = ReactCurrentHostConfig.current.createTextInstance(
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
    workInProgress.stateNode = ReactCurrentHostConfig.current.createInstance(
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
    workInProgress.stateNode = ReactCurrentHostConfig.current.createTextInstance(
      workInProgress.props.text,
      workInProgress,
    )
  }
}

export const beginWork = (current: Fiber, workInProgress: Fiber): void => {
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
