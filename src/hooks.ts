import { ReactCurrentDispatcher, EFFECT, LAYOUT, NOEFFECT, EFFECTONCE, LAYOUTONCE } from './constants'
import { scheduleUpdateOnFiber } from './scheduler'
import type { Fiber, Hook, Queue, Effect } from './types'

let currentlyRenderingFiber: any = null
let workInProgressHook: any = null
let currentHook: any = null
let effectListIndex = 0

const depsChanged = (a: any[] | null | undefined, b: any[] | null | undefined): boolean => {
  if (a == null || b == null) return true
  return a.length !== b.length || b.some((arg: any, index: number) => !Object.is(arg, a[index]))
}

const mountWorkInProgressHook = (): Hook => {
  const hook = {
    memoizedState: null,
    queue: null,
    next: null,
  }

  if (workInProgressHook === null) {
    currentlyRenderingFiber.hook = workInProgressHook = hook
  } else {
    workInProgressHook = workInProgressHook.next = hook
  }
  return workInProgressHook
}

const updateWorkInProgressHook = (): Hook => {
  let nextCurrentHook
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate
    nextCurrentHook = current.hook
  } else {
    nextCurrentHook = currentHook.next ?? currentHook
  }
  currentHook = nextCurrentHook

  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
  }

  if (workInProgressHook === null) {
    currentlyRenderingFiber.hook = workInProgressHook = newHook
  } else {
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }

  return workInProgressHook
}

const pushEffect = (tag: any, create: any, destroy: any, deps: any): Effect => {
  const effect: Effect = {
    tag,
    create,
    destroy,
    deps,
  }
  if (currentlyRenderingFiber.effect == null) {
    currentlyRenderingFiber.effect = [effect]
  } else {
    currentlyRenderingFiber.effect[effectListIndex] = effect
  }

  return effect
}

const updateCurrentEffect = (tag: any, create: any, destroy: any, deps: any): void => {
  currentlyRenderingFiber.effect[effectListIndex] = {
    tag,
    create,
    destroy,
    deps,
  }
}

const mountMemo = (cb: any, deps: any[]): void => {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = {
    res: cb(),
    deps,
  }
  return hook.memoizedState.res
}
const updateMemo = (cb: any, deps: any[]): void => {
  const hook = updateWorkInProgressHook()

  if (depsChanged(hook.memoizedState.deps, deps)) {
    hook.memoizedState.res = cb()
    hook.memoizedState.deps = deps
    return hook.memoizedState.res
  }

  return hook.memoizedState.res
}

const mountRef = (current: any): void => {
  return mountMemo(() => ({ current }), [])
}
const updateRef = (current: any): void => {
  return updateMemo(() => ({ current }), [])
}

const mountCallback = (cb: any, deps: any[]): void => {
  return mountMemo(() => cb, deps)
}
const updateCallback = (cb: any, deps: any[]): void => {
  return updateMemo(() => cb, deps)
}

const mountImperativeHandle = (ref: any, cb: any, deps: any[] = []): void => {
  return mountMemo(() => void (ref.current = cb()), deps)
}
const updateImperativeHandle = (ref: any, cb: any, deps: any[] = []): void => {
  return updateMemo(() => void (ref.current = cb()), deps)
}

const mountEffect = (cb: Function, deps?: any[]): void => {
  const nextDeps = deps === undefined ? null : deps
  const tag = nextDeps?.length === 0 ? EFFECTONCE : EFFECT
  pushEffect(tag, cb, undefined, nextDeps)
  effectListIndex++
}
const updateEffect = (cb: Function, deps?: any[]): void => {
  const nextDeps = deps === undefined ? null : deps

  if (currentHook !== null) {
    const prevEffect = currentlyRenderingFiber.effect[effectListIndex]
    const destroy = prevEffect.destroy
    const prevDeps = prevEffect.deps
    const tag = depsChanged(nextDeps, prevDeps) ? EFFECT : NOEFFECT
    updateCurrentEffect(tag, cb, destroy, nextDeps)
  }
  effectListIndex++
}

const mountLayoutEffect = (cb: Function, deps?: any[]): void => {
  const nextDeps = deps === undefined ? null : deps
  const tag = nextDeps?.length === 0 ? LAYOUTONCE : LAYOUT
  pushEffect(tag, cb, undefined, nextDeps)
  effectListIndex++
}
const updateLayoutEffect = (cb: Function, deps?: any[]): void => {
  const nextDeps = deps === undefined ? null : deps

  if (currentHook !== null) {
    const prevEffect = currentlyRenderingFiber.effect[effectListIndex]
    const destroy = prevEffect.destroy
    const prevDeps = prevEffect.deps
    const tag = depsChanged(nextDeps, prevDeps) ? LAYOUT : NOEFFECT
    updateCurrentEffect(tag, cb, destroy, nextDeps)
  }
  effectListIndex++
}

const basicStateReducer = (state: any, action: any): any => (typeof action === 'function' ? action(state) : action)

const dispatchAction = (currentlyRenderingFiber: Fiber, queue: Queue, action: any): void => {
  const update: any = { action, next: null }
  const pending = queue.pending
  if (pending === null) {
    update.next = update
  } else {
    update.next = pending.next
    pending.next = update
  }
  queue.pending = update
  const lastRenderedReducer = queue.lastRenderedReducer
  const lastRenderedState = queue.lastRenderedState

  const eagerState = lastRenderedReducer(lastRenderedState, action)
  update.eagerReducer = lastRenderedReducer
  update.eagerState = eagerState
  if (Object.is(eagerState, lastRenderedState)) return
  scheduleUpdateOnFiber(currentlyRenderingFiber)
}

const updateState = (initialState: any): any => {
  return updateReducer(basicStateReducer, initialState)
}
const mountState = (initialState: any): any => {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = initialState
  const queue = (hook.queue = {
    pending: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  })
  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue)
  return [queue.lastRenderedState, dispatch]
}

const mountReducer = (reducer: any, initialArg: any): any => {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = initialArg
  const queue = (hook.queue = {
    pending: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialArg,
  })
  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue)
  return [queue.lastRenderedState, dispatch]
}
const updateReducer = (reducer: any, initialArg: any): any => {
  const hook = updateWorkInProgressHook()
  const queue = hook.queue
  const current = currentHook
  const pendingQueue = queue?.pending

  if (pendingQueue != null) {
    const first = pendingQueue.next
    let newState = current.memoizedState
    let update: Hook | null | undefined = first
    do {
      const action = update?.action
      newState = reducer(newState, action)
      update = update?.next
    } while (update !== null && update !== first)
    queue != null && (queue.pending = null)
    hook.memoizedState = newState
    queue != null && (queue.lastRenderedState = newState)
  }

  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue)
  return [queue?.lastRenderedState, dispatch]
}

const noop = () => {}

const HookDispatcherOnMount = {
  useState: mountState,
  useReducer: mountReducer,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
  useMemo: mountMemo,
  useRef: mountRef,
  useCallback: mountCallback,
  useImperativeHandle: mountImperativeHandle,
  // TODO
  useInsertionEffect: noop,
  useTransition: noop,
  useSyncExternalStore: noop,
}
const HookDispatcherOnUpdate = {
  useState: updateState,
  useReducer: updateReducer,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useRef: updateRef,
  useCallback: updateCallback,
  useImperativeHandle: updateImperativeHandle,
  // TODO
  useInsertionEffect: noop,
  useTransition: noop,
  useSyncExternalStore: noop,
}

export const renderWithHooks = (current: Fiber | null, workInProgress: Fiber, Component: any): any => {
  currentlyRenderingFiber = workInProgress

  if (current != null) {
    ReactCurrentDispatcher.current = HookDispatcherOnUpdate
  } else {
    ReactCurrentDispatcher.current = HookDispatcherOnMount
  }

  let children = currentlyRenderingFiber.props.children
  if (typeof Component === 'function') children = Component(currentlyRenderingFiber.props)

  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null
  effectListIndex = 0
  return children
}
