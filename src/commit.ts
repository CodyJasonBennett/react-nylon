import {
  ReactCurrentHostConfig,
  DELETION,
  PLACEMENT,
  HostText,
  UPDATE,
  NOEFFECT,
  LAYOUT,
  EFFECT,
  FunctionComponent,
  ReactCurrentRoot,
} from './constants'
import { startTransition } from './scheduler'
import type * as React from 'react'
import type { Fiber } from './types'

function commitHookEffectList(currentFiber: Fiber, effectTag?: any): void {
  const effectList = currentFiber.effect
  if (!effectList) return

  for (const effect of effectList) {
    if (effect.tag !== (currentFiber.effectTag == null ? EFFECT : LAYOUT)) continue

    if (effectTag === DELETION || !effect.deps?.length) {
      effect.destroy?.()
      effect.destroy = undefined

      if (effectTag === DELETION) {
        effect.tag = NOEFFECT
        continue
      }
    }

    effect.destroy = effect.create()
    if (effect.deps?.length) effect.tag = NOEFFECT
  }
}

function handleSubRef(currentFiber: Fiber | undefined): void {
  if (currentFiber == null) return
  handleSubRef(currentFiber.child)
  handleSubRef(currentFiber.sibling)
  if (currentFiber.ref != null) {
    typeof currentFiber.ref === 'function'
      ? currentFiber.ref(null)
      : ((currentFiber.ref as React.MutableRefObject<any>).current = null)
    currentFiber.ref = null
  }
}
function commitDeletion(currentFiber: Fiber, returnFiber?: Fiber): void {
  const returnInstance = returnFiber?.stateNode
  const isContainer = returnInstance && !returnFiber?.return

  if (currentFiber.stateNode != null && currentFiber.tag !== FunctionComponent) {
    if (isContainer) {
      ReactCurrentHostConfig.current.removeChildFromContainer!(returnInstance, currentFiber.stateNode)
    } else {
      ReactCurrentHostConfig.current.removeChild!(returnInstance, currentFiber.stateNode)
    }
  } else if (currentFiber.child != null) {
    commitDeletion(currentFiber.child, returnFiber)

    let sibling: Fiber | undefined = currentFiber.child.sibling
    while (sibling != null) {
      commitDeletion(sibling, returnFiber)
      sibling = sibling.sibling
    }
  }
  startTransition(() => commitHookEffectList(currentFiber, DELETION))
  commitHookEffectList(currentFiber, DELETION)
  handleSubRef(currentFiber)
}

export function commitRoot(workInProgressRoot: Fiber, deletions: Fiber[]): void {
  for (const fiber of deletions) commitWork(fiber)
  startTransition(() => commitHookEffectList(workInProgressRoot))
  commitHookEffectList(workInProgressRoot)
  commitWork(workInProgressRoot.child)
  deletions.length = 0
}

export function commitWork(currentFiber: Fiber | null | undefined): void {
  if (currentFiber == null) return
  const effectTag = currentFiber.effectTag
  startTransition(() => commitHookEffectList(currentFiber, effectTag))
  commitHookEffectList(currentFiber, effectTag)

  let returnFiber = currentFiber.return
  while (returnFiber?.tag === FunctionComponent) returnFiber = returnFiber?.return

  const returnInstance = returnFiber?.stateNode
  const isContainer = returnInstance && !returnFiber?.return
  if (currentFiber.effectTag === PLACEMENT) {
    if (currentFiber.stateNode != null && currentFiber.tag !== FunctionComponent) {
      if (currentFiber.return?.tag === FunctionComponent && currentFiber.return?.siblingNode != null) {
        if (isContainer) {
          ReactCurrentHostConfig.current.insertInContainerBefore!(
            returnInstance,
            currentFiber.stateNode,
            currentFiber.return?.siblingNode,
          )
        } else {
          ReactCurrentHostConfig.current.insertBefore!(
            returnInstance,
            currentFiber.stateNode,
            currentFiber.return?.siblingNode,
          )
        }
      } else {
        let nextInstance = null
        let sibling = currentFiber.sibling
        while (sibling != null && nextInstance == null) {
          if (sibling.stateNode != null && sibling.tag !== FunctionComponent && sibling.effectTag !== PLACEMENT) {
            nextInstance = sibling.stateNode
            break
          }
          sibling = sibling.sibling
        }
        if (nextInstance != null) {
          if (isContainer) {
            ReactCurrentHostConfig.current.insertInContainerBefore!(
              returnInstance,
              currentFiber.stateNode,
              nextInstance,
            )
          } else {
            ReactCurrentHostConfig.current.insertBefore!(returnInstance, currentFiber.stateNode, nextInstance)
          }
        } else {
          if (isContainer) {
            ReactCurrentHostConfig.current.appendChildToContainer!(returnInstance, currentFiber.stateNode)
          } else {
            ReactCurrentHostConfig.current.appendChild!(returnInstance, currentFiber.stateNode)
          }
        }
      }

      if (
        ReactCurrentHostConfig.current.finalizeInitialChildren(
          currentFiber.stateNode,
          currentFiber.type as string,
          currentFiber.props,
          ReactCurrentRoot.current.stateNode,
          null,
        )
      ) {
        ReactCurrentHostConfig.current.commitMount!(
          currentFiber.stateNode,
          currentFiber.type as string,
          currentFiber.props,
          currentFiber,
        )
      }
    }
  } else if (currentFiber.effectTag === DELETION) {
    return commitDeletion(currentFiber, returnFiber)
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.tag === HostText) {
      if (currentFiber.alternate?.props.text !== currentFiber.props.text) {
        ReactCurrentHostConfig.current.commitTextUpdate!(
          currentFiber.stateNode as any,
          currentFiber.alternate?.props.text,
          currentFiber.props.text,
        )
      }
    } else {
      if (currentFiber.tag !== FunctionComponent) {
        const updatePayload = ReactCurrentHostConfig.current.prepareUpdate(
          currentFiber.stateNode,
          currentFiber.type as string,
          currentFiber.alternate?.props,
          currentFiber.props,
          ReactCurrentRoot.current.stateNode,
          null,
        )
        if (updatePayload !== null) {
          ReactCurrentHostConfig.current.commitUpdate!(
            currentFiber.stateNode as any,
            updatePayload,
            currentFiber.type as string,
            currentFiber.alternate?.props,
            currentFiber.props,
            currentFiber,
          )
        }
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
        : ReactCurrentHostConfig.current.getPublicInstance(currentFiber.stateNode as any)
    typeof currentFiber.ref === 'function'
      ? currentFiber.ref(publicInstance)
      : ((currentFiber.ref as React.MutableRefObject<any>).current = publicInstance)
  }
}
