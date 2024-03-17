import {
  HostRoot,
  HostPortal,
  HostText,
  HostComponent,
  FunctionComponent,
  DELETION,
  PLACEMENT,
  UPDATE,
} from './constants'
import { deletions } from './scheduler'
import type { Fiber } from './types'

function createFiberFromElement(element: any): Fiber {
  if (typeof element.then === 'function') element = element.value

  let { type, props = {}, ref, key } = element
  let tag

  if (element.$$typeof === Symbol.for('react.root')) {
    tag = HostRoot
    props = element
  } else if (element.$$typeof === Symbol.for('react.portal')) {
    tag = HostPortal
    props = element
  } else if (typeof element === 'string' || typeof element === 'number') {
    type = ''
    tag = HostText
    props = { text: element }
  } else if (typeof type === 'string') {
    tag = HostComponent
  } else {
    tag = FunctionComponent

    if (type?.$$typeof === Symbol.for('react.provider')) {
      props = { ...props, _context: type._context }
    }

    if (typeof type !== 'function') type = type?.render ?? type?.type ?? type?.$$typeof ?? type
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
  if (oldFiber != null && oldFiber.type === newChild.type) {
    const newFiber: Fiber = {
      ...oldFiber,
      props: newChild.props,
      key: newChild.key,
      return: wip,
      effectTag: UPDATE,
      alternate: oldFiber,
    }
    return newFiber
  }
  const created = createChild(wip, newChild)
  created.effectTag = PLACEMENT
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

function functionComponentNodeTag(wip: Fiber | null | undefined): void {
  let current: Fiber | null | undefined = wip
  while (current != null) {
    if (current.tag === FunctionComponent) {
      let siblingNode: Fiber | null | undefined = null
      let nextFiber = current.sibling
      while (siblingNode === null && nextFiber != null) {
        if (nextFiber.tag !== FunctionComponent && nextFiber.effectTag !== PLACEMENT) {
          siblingNode = nextFiber.stateNode
        }
        nextFiber = nextFiber.sibling
      }
      current.siblingNode = siblingNode
    }
    current = current.sibling
  }
}

function reconcileChildrenArray(current: Fiber | null | undefined, wip: Fiber, newChildren: any[]): Fiber | null {
  let resultingFirstChild: Fiber | null = null
  let previousNewFiber = null
  let oldChildFiber: Fiber | undefined = current?.child
  let nextOldFiber = null
  let newIndex = 0
  let lastPlaceIndex = 0

  for (; oldChildFiber != null && newIndex < newChildren.length; newIndex++) {
    nextOldFiber = oldChildFiber.sibling

    const newChildFiber = newChildren[newIndex]
    if (newChildFiber.key !== oldChildFiber.key) break
    const newFiber = updateElement(wip, oldChildFiber, newChildFiber)

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
    let childToDelete: Fiber | null | undefined = oldChildFiber
    while (childToDelete != null) {
      deleteChild(wip.child, childToDelete)
      childToDelete = childToDelete.sibling
    }
  } else {
    const existingChildren = new Map<number | string, Fiber>()

    for (; newIndex < newChildren.length; newIndex++) {
      let newFiber: Fiber | undefined

      if (oldChildFiber == null) {
        newFiber = createChild(wip, newChildren[newIndex])
      } else {
        let existingChild: Fiber | undefined = oldChildFiber
        while (existingChild != null) {
          const key = existingChild.key ?? existingChild.index!
          existingChildren.set(key, existingChild)
          existingChild = existingChild.sibling
        }

        const newChildFiber = newChildren[newIndex]
        const matchedFiber = existingChildren.get(newChildFiber.key ?? newIndex)!
        newFiber = updateElement(wip, matchedFiber, newChildFiber)
        if (newFiber.alternate != null) {
          existingChildren.delete(newFiber.key ?? newIndex)
        }
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
  }

  functionComponentNodeTag(resultingFirstChild)
  wip.child = resultingFirstChild!
  return resultingFirstChild
}

const filterSpecial = (newChildren: any) =>
  (Array.isArray(newChildren) ? newChildren : [newChildren]).filter((c) => c != null && typeof c !== 'boolean')

export function reconcileChildFibers(current: Fiber | null | undefined, wip: Fiber, newChildren: any): void {
  shouldTrackSideEffects = true
  reconcileChildrenArray(current, wip, filterSpecial(newChildren))
}

export function mountChildFibers(current: Fiber | null | undefined, wip: Fiber, newChildren: any): void {
  shouldTrackSideEffects = false
  reconcileChildrenArray(current, wip, filterSpecial(newChildren))
}
