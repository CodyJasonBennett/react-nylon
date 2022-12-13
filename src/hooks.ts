import { ReactCurrentDispatcher, EFFECT, LAYOUT, NOEFFECT, EFFECTONCE, LAYOUTONCE } from './constants'
import { scheduleUpdateOnFiber } from './scheduler'
import type * as React from 'react'
import type { Fiber, Hook, Queue, Effect } from './types'

let currentlyRenderingFiber: Fiber | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null
let effectListIndex: number = 0

function depsChanged(a: any[] | null | undefined, b: any[] | null | undefined): boolean {
  if (a == null || b == null) return true
  return a.length !== b.length || b.some((arg: any, index: number) => !Object.is(arg, a[index]))
}

function mountWorkInProgressHook(): Hook {
  const hook = {
    memoizedState: null,
    queue: null,
    next: null,
  }

  if (workInProgressHook === null) {
    currentlyRenderingFiber!.hook = workInProgressHook = hook
  } else {
    workInProgressHook = workInProgressHook.next = hook
  }
  return workInProgressHook
}

function updateWorkInProgressHook(): Hook {
  const nextCurrentHook = currentHook?.next ?? currentHook ?? currentlyRenderingFiber!.alternate!.hook!
  currentHook = nextCurrentHook

  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
  }

  if (workInProgressHook === null) {
    currentlyRenderingFiber!.hook = workInProgressHook = newHook
  } else {
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }

  return workInProgressHook
}

function pushEffect(tag: number, create: Function, destroy: Function | undefined, deps: any[] | null): Effect {
  const effect: Effect = {
    tag,
    create,
    destroy,
    deps,
  }
  if (currentlyRenderingFiber!.effect == null) {
    currentlyRenderingFiber!.effect = [effect]
  } else {
    currentlyRenderingFiber!.effect[effectListIndex] = effect
  }

  return effect
}

function updateCurrentEffect(tag: number, create: Function, destroy: Function | undefined, deps: any[] | null): void {
  currentlyRenderingFiber!.effect![effectListIndex] = {
    tag,
    create,
    destroy,
    deps,
  }
}

function mountMemo(cb: Function, deps: any[]): void {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = {
    res: cb(),
    deps,
  }
  return hook.memoizedState.res
}
function updateMemo(cb: Function, deps: any[]): void {
  const hook = updateWorkInProgressHook()

  if (depsChanged(hook.memoizedState.deps, deps)) {
    hook.memoizedState.res = cb()
    hook.memoizedState.deps = deps
    return hook.memoizedState.res
  }

  return hook.memoizedState.res
}

function mountRef(current: any): void {
  return mountMemo(() => ({ current }), [])
}
function updateRef(current: any): void {
  return updateMemo(() => ({ current }), [])
}

function mountCallback(cb: Function, deps: any[]): void {
  return mountMemo(() => cb, deps)
}
function updateCallback(cb: Function, deps: any[]): void {
  return updateMemo(() => cb, deps)
}

function mountImperativeHandle(ref: React.MutableRefObject<any>, cb: Function, deps: any[] = []): void {
  return mountMemo(() => void (ref.current = cb()), deps)
}
function updateImperativeHandle(ref: React.MutableRefObject<any>, cb: Function, deps: any[] = []): void {
  return updateMemo(() => void (ref.current = cb()), deps)
}

function mountEffect(cb: Function, deps?: any[]): void {
  const nextDeps = deps === undefined ? null : deps
  const tag = nextDeps?.length === 0 ? EFFECTONCE : EFFECT
  pushEffect(tag, cb, undefined, nextDeps)
  effectListIndex++
}
function updateEffect(cb: Function, deps?: any[]): void {
  const nextDeps = deps === undefined ? null : deps

  if (currentHook !== null) {
    const prevEffect = currentlyRenderingFiber!.effect![effectListIndex]
    const destroy = prevEffect.destroy
    const prevDeps = prevEffect.deps
    const tag = depsChanged(nextDeps, prevDeps) ? EFFECT : NOEFFECT
    updateCurrentEffect(tag, cb, destroy, nextDeps)
  }
  effectListIndex++
}

function mountLayoutEffect(cb: Function, deps?: any[]): void {
  const nextDeps = deps === undefined ? null : deps
  const tag = nextDeps?.length === 0 ? LAYOUTONCE : LAYOUT
  pushEffect(tag, cb, undefined, nextDeps)
  effectListIndex++
}
function updateLayoutEffect(cb: Function, deps?: any[]): void {
  const nextDeps = deps === undefined ? null : deps

  if (currentHook !== null) {
    const prevEffect = currentlyRenderingFiber!.effect![effectListIndex]
    const destroy = prevEffect.destroy
    const prevDeps = prevEffect.deps
    const tag = depsChanged(nextDeps, prevDeps) ? LAYOUT : NOEFFECT
    updateCurrentEffect(tag, cb, destroy, nextDeps)
  }
  effectListIndex++
}

const basicStateReducer = (state: any, action: any): any => (typeof action === 'function' ? action(state) : action)

function dispatchAction(currentlyRenderingFiber: Fiber, queue: Queue, action: any): void {
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

function updateState(initialState: any): any {
  return updateReducer(basicStateReducer, initialState)
}
function mountState(initialState: any): any {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = initialState
  const queue = (hook.queue = {
    pending: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  })
  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber!, queue)
  return [queue.lastRenderedState, dispatch]
}

function mountReducer(reducer: any, initialArg: any): any {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = initialArg
  const queue = (hook.queue = {
    pending: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialArg,
  })
  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber!, queue)
  return [queue.lastRenderedState, dispatch]
}
function updateReducer(reducer: any, _initialArg: any): any {
  const hook = updateWorkInProgressHook()
  const queue = hook.queue
  const current = currentHook
  const pendingQueue = queue?.pending

  if (pendingQueue != null) {
    const first = pendingQueue.next
    let newState = current!.memoizedState
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

  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber!, queue!)
  return [queue?.lastRenderedState, dispatch]
}

const HookDispatcherOnMount = {
  readContext(_context: any): any {},
  useCallback(callback: any, deps: any): any {
    return mountCallback(callback, deps)
  },
  useContext(_context: any): any {},
  useDebugValue(_value: any, _formatterFn: any): any {},
  useDeferredValue(_value: any): any {},
  useEffect(create: any, deps: any): any {
    return mountEffect(create, deps)
  },
  useId(): any {},
  useImperativeHandle(ref: any, create: any, deps: any): any {
    return mountImperativeHandle(ref, create, deps)
  },
  useInsertionEffect(_create: any, _deps: any): any {},
  useLayoutEffect(create: any, deps: any): any {
    return mountLayoutEffect(create, deps)
  },
  useMemo(create: any, deps: any): any {
    return mountMemo(create, deps)
  },
  useMutableSource(_source: any, _getSnapshot: any, _subscribe: any): any {},
  useReducer(reducer: any, initialArg: any): any {
    return mountReducer(reducer, initialArg)
  },
  useRef(initialValue: any): any {
    return mountRef(initialValue)
  },
  useState(initialState: any): any {
    return mountState(initialState)
  },
  useSyncExternalStore(_subscribe: any, _getSnapshot: any, _getServerSnapshot: any): any {},
  useTransition(): any {},
}
const HookDispatcherOnUpdate = {
  readContext(_context: any): any {},
  useCallback(callback: any, deps: any): any {
    return updateCallback(callback, deps)
  },
  useContext(_context: any): any {},
  useDebugValue(_value: any, _formatterFn: any): any {},
  useDeferredValue(_value: any): any {},
  useEffect(create: any, deps: any): any {
    return updateEffect(create, deps)
  },
  useId(): any {},
  useImperativeHandle(ref: any, create: any, deps: any): any {
    return updateImperativeHandle(ref, create, deps)
  },
  useInsertionEffect(_create: any, _deps: any): any {},
  useLayoutEffect(create: any, deps: any): any {
    return updateLayoutEffect(create, deps)
  },
  useMemo(create: any, deps: any): any {
    return updateMemo(create, deps)
  },
  useMutableSource(_source: any, _getSnapshot: any, _subscribe: any): any {},
  useReducer(reducer: any, initialArg: any): any {
    return updateReducer(reducer, initialArg)
  },
  useRef(initialValue: any): any {
    return updateRef(initialValue)
  },
  useState(initialState: any): any {
    return updateState(initialState)
  },
  useSyncExternalStore(_subscribe: any, _getSnapshot: any, _getServerSnapshot: any): any {},
  useTransition(): any {},
}

export function renderWithHooks(current: Fiber | null, workInProgress: Fiber, Component: Function): any {
  currentlyRenderingFiber = workInProgress

  if (current != null) {
    ReactCurrentDispatcher.current = HookDispatcherOnUpdate
  } else {
    ReactCurrentDispatcher.current = HookDispatcherOnMount
  }

  const children = Component(currentlyRenderingFiber.props)

  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null
  effectListIndex = 0
  return children
}
