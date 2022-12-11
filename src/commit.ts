import {
  DELETION,
  HostComponent,
  HostRoot,
  PLACEMENT,
  HostText,
  UPDATE,
  EFFECT,
  FunctionComponent,
  EFFECTONCE,
  NOEFFECT,
  LAYOUTONCE,
  LAYOUT,
} from './constants'
import { ReactCurrentHostConfig, schedule } from './scheduler'
import type { Fiber } from './types'

export const commitRoot = (workInProgressRoot: Fiber, deletions: Fiber[]): void => {
  for (const fiber of deletions) commitWork(fiber)
  schedule(() => commitHookEffectList(workInProgressRoot))
  commitHookLayoutEffectList(workInProgressRoot)
  commitWork(workInProgressRoot.child)
  deletions.length = 0
}
export const commitWork = (currentFiber: Fiber | null | undefined): void => {
  if (currentFiber == null) return
  const fiberTag = currentFiber.effectTag
  schedule(() => commitHookEffectList(currentFiber, fiberTag))
  commitHookLayoutEffectList(currentFiber, fiberTag)

  let returnFiber = currentFiber.return
  while (
    returnFiber != null &&
    returnFiber.tag !== HostText &&
    returnFiber.tag !== HostRoot &&
    returnFiber.tag !== HostComponent
  ) {
    returnFiber = returnFiber?.return
  }
  const returnInstance = returnFiber?.stateNode
  if (currentFiber.effectTag === PLACEMENT) {
    const nextFiber = currentFiber
    if (nextFiber.stateNode != null) {
      if (nextFiber.return?.tag === FunctionComponent && nextFiber.return?.siblingNode != null) {
        ReactCurrentHostConfig.current!.insertBefore(returnInstance, nextFiber.stateNode, nextFiber.return?.siblingNode)
      } else {
        let nextInstance = null
        let sibling = nextFiber.sibling
        while (sibling != null && nextInstance == null) {
          if (sibling.stateNode != null && sibling.effectTag !== PLACEMENT) {
            nextInstance = sibling.stateNode
            break
          }
          sibling = sibling.sibling
        }
        if (nextInstance != null) {
          ReactCurrentHostConfig.current!.insertBefore(returnInstance, nextFiber.stateNode, nextInstance)
        } else {
          ReactCurrentHostConfig.current!.appendChild(returnInstance, nextFiber.stateNode)
        }
      }
    }
  } else if (currentFiber.effectTag === DELETION) {
    return commitDeletion(currentFiber, returnInstance)
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.tag === HostText) {
      if (currentFiber.alternate?.props.text !== currentFiber.props.text) {
        ReactCurrentHostConfig.current!.commitTextUpdate(
          currentFiber.stateNode as any,
          currentFiber.alternate?.props.text,
          currentFiber.props.text,
          currentFiber,
        )
      }
    } else {
      if (currentFiber.tag !== FunctionComponent) {
        ReactCurrentHostConfig.current!.commitUpdate(
          currentFiber.stateNode as any,
          currentFiber.alternate?.props,
          currentFiber.props,
          currentFiber,
        )
      }
    }
  }

  currentFiber.effectTag = null
  commitWork(currentFiber.child)
  commitWork(currentFiber.sibling)

  if (currentFiber.ref != null) {
    const publicInstance =
      currentFiber.stateNode == null
        ? null
        : ReactCurrentHostConfig.current!.getPublicInstance(currentFiber.stateNode as any)
    typeof currentFiber.ref === 'function'
      ? currentFiber.ref(publicInstance)
      : (currentFiber.ref.current = publicInstance)
  }
}
const commitDeletion = (currentFiber: Fiber, returnInstance: any): void => {
  if (currentFiber.stateNode != null) {
    ReactCurrentHostConfig.current!.removeChild(returnInstance, currentFiber.stateNode)
  } else {
    if (currentFiber.child != null) {
      commitDeletion(currentFiber.child, returnInstance)
    }
  }
  schedule(() => commitHookEffectList(currentFiber, DELETION))
  commitHookLayoutEffectList(currentFiber, DELETION)
  handleSubRef(currentFiber)
}

const handleSubRef = (currentFiber: Fiber | undefined): void => {
  if (currentFiber == null) return
  handleSubRef(currentFiber.child)
  handleSubRef(currentFiber.sibling)
  if (currentFiber.ref != null) {
    typeof currentFiber.ref === 'function' ? currentFiber.ref(null) : (currentFiber.ref.current = null)
    currentFiber.ref = null
  }
}
const commitHookEffectList = (currentFiber: Fiber, fiberTag?: any): void => {
  const effectList = currentFiber.effect
  if (!effectList) return

  for (const effect of effectList) {
    if (fiberTag === DELETION || effect.tag === EFFECT) {
      const destroy = effect.destroy
      effect.destroy = undefined
      if (destroy !== undefined) {
        destroy()
      }
      if (fiberTag === DELETION) effect.tag = NOEFFECT
    }
    if (effect.tag === EFFECTONCE) {
      const create = effect.create
      effect.destroy = create()
      effect.tag = NOEFFECT
    }
    if (effect.tag === EFFECT) {
      const create = effect.create
      effect.destroy = create()
    }
  }
}

const commitHookLayoutEffectList = (currentFiber: Fiber, fiberTag?: any): void => {
  const effectList = currentFiber.effect
  if (!effectList) return

  for (const effect of effectList) {
    if (effect.tag === NOEFFECT) return
    if (fiberTag === DELETION || effect.tag === LAYOUT) {
      const destroy = effect.destroy
      effect.destroy = undefined
      if (destroy !== undefined) {
        destroy()
      }
      if (fiberTag === DELETION) effect.tag = NOEFFECT
    }
    if (effect.tag === LAYOUTONCE) {
      const create = effect.create
      effect.destroy = create()
      effect.tag = NOEFFECT
    }
    if (effect.tag === LAYOUT) {
      const create = effect.create
      effect.destroy = create()
    }
  }
}
