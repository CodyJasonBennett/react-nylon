import { FunctionComponent, HostComponent, HostText, DELETION, PLACEMENT, UPDATE } from './constants'
import { deletions } from './scheduler'
import type { Fiber } from './types'

function createFiberFromElement(element: any): Fiber {
  let { type, props, ref, key } = element
  let tag

  if (typeof element === 'string' || typeof element === 'number') {
    type = ''
    props = { text: element, children: [] }
    tag = HostText
  } else if (typeof type === 'string') {
    tag = HostComponent
  } else {
    tag = FunctionComponent
  }

  return {
    type,
    tag,
    props,
    ref,
    key,
  }
}

let shouldTrackSideEffects: boolean = false

function deleteChild(firstChild: Fiber | null | undefined, child: Fiber): void {
  if (!shouldTrackSideEffects) return
  child.effectTag = DELETION
  deletions.push(child)

  let prevChild = firstChild
  let nextChild = firstChild
  while (nextChild != null && prevChild != null) {
    if (nextChild.effectTag === DELETION) {
      prevChild.sibling = nextChild.sibling
    }
    prevChild = nextChild
    nextChild = nextChild.sibling
  }
}
function createChild(returnFiber: Fiber, newChild: any): Fiber {
  const created = createFiberFromElement(newChild)
  created.return = returnFiber
  return created
}
function updateElement(wip: Fiber, oldFiber: Fiber, newChild: any): Fiber {
  if (oldFiber != null) {
    if (oldFiber.type === newChild.type) {
      let newFiber: Fiber | null = null
      newFiber = {
        ...oldFiber,
        props: newChild.props,
        key: newChild.key,
        return: wip,
        effectTag: UPDATE,
        alternate: oldFiber,
      }
      return newFiber
    }
  }
  const created = createFiberFromElement(newChild)
  created.effectTag = PLACEMENT
  created.return = wip
  return created
}

function placeChild(newFiber: Fiber, lastPlaceIndex: number, newIndex: number): number {
  newFiber.index = newIndex

  const current = newFiber.alternate
  if (current != null) {
    const oldIndex = current.index!
    if (oldIndex != null && oldIndex < lastPlaceIndex) {
      newFiber.effectTag = PLACEMENT
      return lastPlaceIndex
    } else {
      return oldIndex
    }
  } else {
    newFiber.effectTag = PLACEMENT
    return lastPlaceIndex
  }
}
function updateFromMap(existingChildren: Map<any, any>, returnFiber: Fiber, newIndex: number, newChild: any): Fiber {
  const matchedFiber = existingChildren.get(newChild.key ?? newIndex)
  return updateElement(returnFiber, matchedFiber, newChild)
}
function updateSlot(wip: Fiber, oldFiber: Fiber, newChild: any): Fiber | null {
  const key = oldFiber != null ? oldFiber.key : null
  if (newChild.key === key) {
    return updateElement(wip, oldFiber, newChild)
  } else {
    return null
  }
}
function deleteRemainingChildren(wip: Fiber, childFiber: Fiber | null | undefined): void {
  if (childFiber == null) return undefined
  let childToDelete: any = childFiber
  while (childToDelete != null) {
    deleteChild(wip.child, childToDelete)
    childToDelete = childToDelete.sibling
  }
}

function findNextStateNode(wip: Fiber): void {
  let siblingNode: any = null
  let nextFiber = wip.sibling
  while (siblingNode === null && nextFiber != null) {
    if (nextFiber.stateNode != null && nextFiber.effectTag !== PLACEMENT) {
      siblingNode = nextFiber.stateNode
    }
    nextFiber = nextFiber.sibling
  }
  wip.siblingNode = siblingNode
}

function functionComponentNodeTag(wip: Fiber): void {
  let current: any = wip
  while (current != null) {
    if (current.tag === FunctionComponent) findNextStateNode(current)
    current = current.sibling
  }
}
function reconcileChildrenArray(current: Fiber | null | undefined, wip: Fiber, newChildren: any[]): Fiber | null {
  let resultingFirstChild: any = null
  let previousNewFiber = null
  let oldChildFiber: any = current?.child
  let nextOldFiber = null
  let newIndex = 0
  let lastPlaceIndex = 0

  for (; oldChildFiber != null && newIndex < newChildren.length; newIndex++) {
    nextOldFiber = oldChildFiber.sibling
    const newFiber = updateSlot(wip, oldChildFiber, newChildren[newIndex])
    if (newFiber == null) break
    if (newFiber.alternate == null) {
      deleteChild(wip.child, oldChildFiber)
    }
    lastPlaceIndex = placeChild(newFiber, lastPlaceIndex, newIndex)
    if (previousNewFiber == null) {
      resultingFirstChild = newFiber
    } else {
      previousNewFiber.sibling = newFiber
    }
    previousNewFiber = newFiber
    oldChildFiber = nextOldFiber
  }

  if (newIndex === newChildren.length) {
    deleteRemainingChildren(wip, oldChildFiber)
    functionComponentNodeTag(resultingFirstChild)
    wip.child = resultingFirstChild!
    return resultingFirstChild
  }

  if (oldChildFiber == null) {
    for (; newIndex < newChildren.length; newIndex++) {
      const newFiber = createChild(wip, newChildren[newIndex])
      lastPlaceIndex = placeChild(newFiber, lastPlaceIndex, newIndex)
      newFiber.effectTag = PLACEMENT
      if (previousNewFiber == null) {
        resultingFirstChild = newFiber
      } else {
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber
    }
    functionComponentNodeTag(resultingFirstChild)
    wip.child = resultingFirstChild!

    return resultingFirstChild
  }

  const existingChildren = mapRemainingChildren(wip, oldChildFiber)
  for (; newIndex < newChildren.length; newIndex++) {
    const newFiber = updateFromMap(existingChildren, wip, newIndex, newChildren[newIndex])

    if (newFiber.alternate != null) {
      existingChildren.delete(newFiber.key ?? newIndex)
    }
    lastPlaceIndex = placeChild(newFiber, lastPlaceIndex, newIndex)
    if (previousNewFiber == null) {
      resultingFirstChild = newFiber
    } else {
      previousNewFiber.sibling = newFiber
    }
    previousNewFiber = newFiber
  }
  for (const [, child] of existingChildren) deleteChild(resultingFirstChild, child)
  functionComponentNodeTag(resultingFirstChild)
  wip.child = resultingFirstChild!
  return resultingFirstChild
}
function mapRemainingChildren(returnFiber: Fiber, currentFirstChild: Fiber): Map<number | string, Fiber> {
  const existingChildren = new Map()
  let existingChild: any = currentFirstChild
  while (existingChild != null) {
    const key = existingChild.key ?? existingChild.index
    existingChildren.set(key, existingChild)
    existingChild = existingChild.sibling
  }
  return existingChildren
}
export function reconcileChildFibers(current: Fiber | null | undefined, wip: Fiber, newChild: any): void {
  shouldTrackSideEffects = true
  reconcileChildrenArray(current, wip, Array.isArray(newChild) ? newChild : [newChild])
}
export function mountChildFibers(current: Fiber | null | undefined, wip: Fiber, newChild: any): void {
  shouldTrackSideEffects = false
  reconcileChildrenArray(current, wip, Array.isArray(newChild) ? newChild : [newChild])
}
