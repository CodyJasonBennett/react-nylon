import { ReactCurrentDispatcher, EFFECT, LAYOUT, INSERTION, NOEFFECT } from './constants'
import { promises, scheduleUpdateOnFiber, startTransition } from './scheduler'
import * as React from 'react'
import type { Fiber, Hook, Queue, Effect } from './types'

let mounted: boolean = false
let currentlyRenderingFiber: Fiber | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null
let effectListIndex: number = 0

function depsChanged(
  a: readonly any[] | any[] | null | undefined,
  b: readonly any[] | any[] | null | undefined,
): boolean {
  if (a == null || b == null) return true
  return a.length !== b.length || b.some((arg: any, index: number) => !Object.is(arg, a[index]))
}

function getWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    queue: null,
    next: null,
  }

  if (mounted) {
    currentHook = currentHook?.next ?? currentHook ?? currentlyRenderingFiber!.alternate!.hook!

    hook.memoizedState = currentHook.memoizedState
    hook.queue = currentHook.queue
  }

  if (workInProgressHook === null) {
    currentlyRenderingFiber!.hook = workInProgressHook = hook
  } else {
    workInProgressHook = workInProgressHook.next = hook
  }

  return workInProgressHook
}

function effectImpl(tag: number, create: Function, deps: React.DependencyList | null = null): void {
  if (mounted) {
    const effect = currentlyRenderingFiber!.effect![effectListIndex++]
    effect.tag = depsChanged(deps, effect.deps) ? tag : NOEFFECT
    effect.create = create
    effect.deps = deps
  } else {
    const effect: Effect = {
      tag,
      create,
      deps,
    }

    currentlyRenderingFiber!.effect ??= []
    currentlyRenderingFiber!.effect[effectListIndex++] = effect
  }
}

function readContext<T>(context: React.Context<T>): T {
  let contextFiber = currentlyRenderingFiber!.return
  while (contextFiber && contextFiber?.props._context !== context) {
    contextFiber = contextFiber.return
  }

  return contextFiber ? contextFiber.props.value : (context as any)._currentValue
}

function useContext<T>(context: React.Context<T>): T {
  return readContext(context)
}

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
function useReducer<R extends React.Reducer<any, any> | React.ReducerWithoutAction<any>, I>(
  reducer: R,
  initialState: I,
  initializer?: (arg: I) => React.ReducerState<R>,
): [I, React.Dispatch<R extends React.Reducer<any, any> ? React.ReducerAction<R> : React.DispatchWithoutAction>] {
  const hook = getWorkInProgressHook()
  let queue = hook.queue
  const current = currentHook
  const pendingQueue = queue?.pending

  if (!mounted) {
    hook.memoizedState = typeof initializer === 'function' ? initializer(initialState) : initialState
    queue = hook.queue = {
      pending: null,
      lastRenderedReducer: reducer,
      lastRenderedState: hook.memoizedState,
    }
  } else if (pendingQueue != null) {
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

const basicStateReducer = (state: any, action: any): any => (typeof action === 'function' ? action(state) : action)
function useState<S>(initialState?: S | (() => S)): [S, React.Dispatch<React.SetStateAction<S | undefined>>] {
  return useReducer(basicStateReducer, initialState as S, (state) => (typeof state === 'function' ? state() : state))
}

function useMemo<T>(factory: () => T, deps: React.DependencyList | undefined): T {
  const hook = getWorkInProgressHook()

  if (!mounted) {
    hook.memoizedState = {
      res: factory(),
      deps,
    }
  } else if (depsChanged(hook.memoizedState.deps, deps)) {
    hook.memoizedState.res = factory()
    hook.memoizedState.deps = deps
    return hook.memoizedState.res
  }

  return hook.memoizedState.res
}

function useCallback<T extends Function>(callback: T, deps: React.DependencyList): T {
  return useMemo(() => callback, deps)
}

function useRef<T>(current?: T): React.MutableRefObject<T | undefined> {
  return useMemo(() => ({ current }), [])
}

function useEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
  return effectImpl(EFFECT, effect, deps)
}

function useLayoutEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
  return effectImpl(LAYOUT, effect, deps)
}

function useInsertionEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
  return effectImpl(INSERTION, effect, deps)
}

function useImperativeHandle<T, R extends T>(
  ref: React.Ref<T> | undefined,
  init: () => R,
  deps?: React.DependencyList,
): void {
  return useLayoutEffect(() => {
    if (typeof ref === 'function') {
      ref(init())
      return () => ref(null!)
    } else if (ref) {
      const _ref = ref as React.MutableRefObject<T>
      _ref.current = init()
      return () => (_ref.current = null!)
    }
  }, deps)
}

function useDebugValue<T>(value: T, format?: (value: T) => any): void {
  // This hook is normally a no-op.
  // The react-debug-hooks package injects its own implementation
  // so that e.g. DevTools can display custom hook values.
}

function useDeferredValue<T>(value: T): T {
  const [deferredValue, setDeferredValue] = useState(value)

  useEffect(() => startTransition(() => setDeferredValue(value)), [value])

  return deferredValue
}

let id = 0
function useId(): string {
  return useMemo(() => '' + id++, [])
}

function useSyncExternalStore<Snapshot>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot?: () => Snapshot,
): Snapshot {
  const value = getSnapshot()
  const [state, forceUpdate] = useState(() => ({ value, getSnapshot }))

  const invalidate = useCallback(() => {
    if (!Object.is(state.value, state.getSnapshot())) {
      forceUpdate(state)
    }
  }, [])

  useLayoutEffect(() => {
    state.value = value
    state.getSnapshot = getSnapshot

    invalidate()
  }, [subscribe, value, getSnapshot])

  useEffect(() => (invalidate(), subscribe(invalidate)), [subscribe])

  return value
}

function useTransition(): [boolean, React.TransitionStartFunction] {
  const [pending, setPending] = useState(false)
  const transitionStartFn = useCallback((callback: React.TransitionFunction): void => {
    setPending(true)
    startTransition(() => {
      callback()
      setPending(false)
    })
  }, [])
  return [pending, transitionStartFn]
}

const HookDispatcher: Record<string, Function> = {
  readContext,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
}

const isReactComponent = (type: any): type is new (...args: any[]) => React.Component =>
  type?.prototype?.isReactComponent

const isPromise = <T>(value: any): value is Promise<T> => typeof value?.then === 'function'

export function renderWithHooks(current: Fiber | null, workInProgress: Fiber, Component: any): any {
  currentlyRenderingFiber = workInProgress
  ReactCurrentDispatcher.current = HookDispatcher

  mounted = current != null

  let children: any = currentlyRenderingFiber.props.children
  try {
    if (typeof Component === 'function') {
      if (isReactComponent(Component)) {
        const instance = new Component(currentlyRenderingFiber.props)

        // @ts-ignore
        instance.props ??= currentlyRenderingFiber.props
        instance.state ??= {}

        const fiber = currentlyRenderingFiber
        instance.forceUpdate = function (callback?: () => void) {
          scheduleUpdateOnFiber(fiber)
          if (callback) startTransition(callback)
        }
        instance.setState = function (state: Function | any, callback?: () => void) {
          const newState = typeof state === 'function' ? state(instance.state, instance.props) : state
          if (newState) {
            Object.assign(instance.state, newState)
            instance.forceUpdate(callback)
          }
        }
        currentlyRenderingFiber.stateNode ??= instance

        children = instance.render()
      } else {
        children = Component(currentlyRenderingFiber.props, currentlyRenderingFiber.ref)
      }
    }
  } catch (e) {
    if (isPromise(e)) {
      let root: Fiber = currentlyRenderingFiber
      while (root.return && root.type !== Symbol.for('react.suspense')) root = root.return
      children = root.props.fallback

      promises.push(e)

      e.then((value) => {
        // @ts-ignore
        e.value = value

        const index = promises.indexOf(e as Promise<any>)
        if (index !== -1) promises.splice(index, 1)

        scheduleUpdateOnFiber(root)
      })
    } else {
      let root: Fiber = currentlyRenderingFiber
      while (root.return && !isReactComponent(root.type)) root = root.return

      const instance = root.stateNode as React.Component | undefined
      const getDerivedStateFromError = (root.type as any).getDerivedStateFromError
      if (getDerivedStateFromError) instance!.setState(getDerivedStateFromError(e))

      const componentDidCatch = instance?.componentDidCatch?.bind(instance)
      if (componentDidCatch) componentDidCatch?.(e as Error, {} as React.ErrorInfo)
      else throw e
    }
  }

  currentlyRenderingFiber = null
  ReactCurrentDispatcher.current = null
  workInProgressHook = null
  currentHook = null
  effectListIndex = 0

  return children
}
