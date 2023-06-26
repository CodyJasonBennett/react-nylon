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

function pushEffect(
  tag: number,
  create: Function,
  destroy: Function | undefined,
  deps: React.DependencyList | null,
): Effect {
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

function updateCurrentEffect(
  tag: number,
  create: Function,
  destroy: Function | undefined,
  deps: React.DependencyList | null,
): void {
  currentlyRenderingFiber!.effect![effectListIndex] = {
    tag,
    create,
    destroy,
    deps,
  }
}

function mountMemo(cb: Function, deps?: React.DependencyList): any {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = {
    res: cb(),
    deps,
  }
  return hook.memoizedState.res
}
function updateMemo(cb: Function, deps?: React.DependencyList): any {
  const hook = updateWorkInProgressHook()

  if (depsChanged(hook.memoizedState.deps, deps)) {
    hook.memoizedState.res = cb()
    hook.memoizedState.deps = deps
    return hook.memoizedState.res
  }

  return hook.memoizedState.res
}

function mountEffect(tag: number, cb: Function, deps?: React.DependencyList): void {
  const nextDeps = deps === undefined ? null : deps
  pushEffect(tag, cb, undefined, nextDeps)
  effectListIndex++
}
function updateEffect(tag: number, cb: Function, deps?: React.DependencyList): void {
  const nextDeps = deps === undefined ? null : deps

  if (currentHook !== null) {
    const prevEffect = currentlyRenderingFiber!.effect![effectListIndex]
    const destroy = prevEffect.destroy
    const prevDeps = prevEffect.deps
    if (!depsChanged(nextDeps, prevDeps)) tag = NOEFFECT
    updateCurrentEffect(tag, cb, destroy, nextDeps)
  }
  effectListIndex++
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

const basicStateReducer = (state: any, action: any): any => (typeof action === 'function' ? action(state) : action)
function updateState(initialState: any): any {
  return updateReducer(basicStateReducer, initialState)
}
function mountState(initialState: any): any {
  return mountReducer(basicStateReducer, typeof initialState === 'function' ? initialState() : initialState)
}

function mountReducer(reducer: any, initialArg: any, initializer?: any): any {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = typeof initializer === 'function' ? initializer(initialArg) : initialArg
  const queue = (hook.queue = {
    pending: null,
    lastRenderedReducer: reducer,
    lastRenderedState: hook.memoizedState,
  })
  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber!, queue)
  return [queue.lastRenderedState, dispatch]
}
function updateReducer(reducer: any, initialArg: any, initializer?: any): any {
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

function readContext<T>(context: React.Context<T>): T {
  let contextFiber = currentlyRenderingFiber!.return
  while (contextFiber && contextFiber.type !== Symbol.for('react.provider')) {
    contextFiber = contextFiber.return
  }

  return contextFiber ? contextFiber.props.value : (context as any)._defaultValue
}

function useContext<T>(context: React.Context<T>): T {
  return readContext(context)
}

function useCallback<T extends Function>(callback: T, deps: React.DependencyList): T {
  return useMemo(() => callback, deps)
}

// the name of the custom hook is itself derived from the function name at runtime:
// it's just the function name without the "use" prefix.
function useDebugValue<T>(value: T, format?: (value: T) => any): void {}

function useDeferredValue<T>(value: T): T {
  return value
}

function useEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
  return mounted ? updateEffect(EFFECT, effect, deps) : mountEffect(EFFECT, effect, deps)
}

function useId(): string {
  return ''
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

function useInsertionEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
  return mounted ? updateEffect(INSERTION, effect, deps) : mountEffect(INSERTION, effect, deps)
}

function useLayoutEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
  return mounted ? updateEffect(LAYOUT, effect, deps) : mountEffect(LAYOUT, effect, deps)
}

// allow undefined, but don't make it optional as that is very likely a mistake
function useMemo<T>(factory: () => T, deps: React.DependencyList | undefined): T {
  return mounted ? updateMemo(factory, deps) : mountMemo(factory, deps)
}

function useReducer<R extends React.Reducer<any, any> | React.ReducerWithoutAction<any>, I>(
  reducer: R,
  initialState: I,
  initializer?: (arg: I & React.ReducerState<R>) => React.ReducerState<R>,
): [I, React.Dispatch<R extends React.Reducer<any, any> ? React.ReducerAction<R> : React.DispatchWithoutAction>] {
  return mounted ? updateReducer(reducer, initialState, initializer) : mountReducer(reducer, initialState, initializer)
}

function useRef<T>(current?: T): React.MutableRefObject<T | undefined> {
  return useMemo(() => ({ current }), [])
}

function useState<S>(initialState?: S | (() => S)): [S, React.Dispatch<React.SetStateAction<S | undefined>>] {
  return mounted ? updateState(initialState) : mountState(initialState)
}

// https://github.com/reactwg/react-18/discussions/86
function useSyncExternalStore<Snapshot>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot?: () => Snapshot,
): Snapshot {
  return null!
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

const HookDispatcher = {
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
