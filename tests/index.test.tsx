import * as React from 'react'
import { vi, describe, it, expect } from 'vitest'
import _Reconciler from 'react-reconciler'
import { createRoot, Root, act as _act } from 'react-nylon'

declare module 'react' {
  const unstable_act: <T = any>(cb: () => Promise<T>) => Promise<T>
}

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

// Let React know that we'll be testing effectful components
global.IS_REACT_ACT_ENVIRONMENT = true

// Mock scheduler to test React features
vi.mock('scheduler', () => require('scheduler/unstable_mock'))

interface ReactProps<T> {
  key?: React.Key
  ref?: React.Ref<T>
  children?: React.ReactNode
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      element: ReactProps<null> & Record<string, unknown>
    }
  }
}

let mocking = false

function Reconciler<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
  ChildSet,
  TimeoutHandle,
  NoTimeout,
>(
  config: _Reconciler.HostConfig<
    Type,
    Props,
    Container,
    Instance,
    TextInstance,
    SuspenseInstance,
    HydratableInstance,
    PublicInstance,
    HostContext,
    UpdatePayload,
    ChildSet,
    TimeoutHandle,
    NoTimeout
  >,
): ReturnType<
  typeof _Reconciler<
    Type,
    Props,
    Container,
    Instance,
    TextInstance,
    SuspenseInstance,
    HydratableInstance,
    PublicInstance,
    HostContext,
    UpdatePayload,
    ChildSet,
    TimeoutHandle,
    NoTimeout
  >
> {
  if (!mocking) return _Reconciler(config)

  let _root: Root
  return {
    createContainer(container: any) {
      _root = createRoot(container, config)
    },
    updateContainer(element: React.ReactNode) {
      return _root.render(element)
    },
    createPortal() {},
    injectIntoDevTools() {},
  } as unknown as any
}

for (const suite of ['react-reconciler', 'react-nylon']) {
  mocking = suite === 'react-nylon'
  const act = suite === 'react-nylon' ? _act : React.unstable_act

  interface ReconcilerNode<P = Record<string, unknown>> {
    type: string
    props: P
    children: ReconcilerNode[]
  }

  interface HostContainer {
    head: ReconcilerNode | null
  }

  interface HostConfig {
    type: string
    props: Record<string, unknown>
    container: HostContainer
    instance: ReconcilerNode
    textInstance: ReconcilerNode
    suspenseInstance: ReconcilerNode
    hydratableInstance: never
    publicInstance: null
    hostContext: null
    updatePayload: {}
    childSet: never
    timeoutHandle: number
    noTimeout: -1
  }

  // react-reconciler exposes some sensitive props. We don't want them exposed in public instances
  const REACT_INTERNAL_PROPS = ['ref', 'key', 'children']
  function getInstanceProps(props: Record<string, unknown>): HostConfig['props'] {
    const instanceProps: HostConfig['props'] = {}

    for (const key in props) {
      if (REACT_INTERNAL_PROPS.includes(key)) continue
      instanceProps[key] = props[key]
    }

    return instanceProps
  }

  const reconciler = Reconciler<
    HostConfig['type'],
    HostConfig['props'],
    HostConfig['container'],
    HostConfig['instance'],
    HostConfig['textInstance'],
    HostConfig['suspenseInstance'],
    HostConfig['hydratableInstance'],
    HostConfig['publicInstance'],
    HostConfig['hostContext'],
    HostConfig['updatePayload'],
    HostConfig['childSet'],
    HostConfig['timeoutHandle'],
    HostConfig['noTimeout']
  >({
    isPrimaryRenderer: false,
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    now: Date.now,
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,
    createInstance: (type, props) => ({ type, props: getInstanceProps(props), children: [] }),
    hideInstance() {},
    unhideInstance() {},
    createTextInstance: (value) => ({ type: 'text', props: { value }, children: [] }),
    hideTextInstance() {},
    unhideTextInstance() {},
    appendInitialChild: (parent, child) => parent.children.push(child),
    appendChild: (parent, child) => parent.children.push(child),
    appendChildToContainer: (container, child) => (container.head = child),
    insertBefore: (parent, child, beforeChild) =>
      parent.children.splice(parent.children.indexOf(beforeChild), 0, child),
    insertInContainerBefore: (container, child) => (container.head = child),
    removeChild: (parent, child) => parent.children.splice(parent.children.indexOf(child), 1),
    removeChildFromContainer: (container, child) => void (container.head === child && (container.head = null)),
    getPublicInstance: () => null,
    getRootHostContext: () => null,
    getChildHostContext: () => null,
    shouldSetTextContent: () => false,
    finalizeInitialChildren: () => false,
    prepareUpdate: (_instance, _type, _oldProps, newProps) => getInstanceProps(newProps),
    commitUpdate: (instance, props) => void (instance.props = props),
    commitTextUpdate: (instance, _, value) => (instance.props.value = value),
    prepareForCommit: () => null,
    resetAfterCommit() {},
    preparePortalMount() {},
    clearContainer: (container) => (container.head = null),
    // @ts-ignore
    getCurrentEventPriority: () => 0b0000000000000000000000000100000,
    beforeActiveInstanceBlur: () => {},
    afterActiveInstanceBlur: () => {},
    detachDeletedInstance: () => {},
  })

  reconciler.injectIntoDevTools({
    findFiberByHostInstance: () => null,
    bundleType: 0,
    version: React.version,
    rendererPackageName: 'test-renderer',
  })

  const container: HostContainer = { head: null }
  const root = reconciler.createContainer(container, 1, null, false, null, '', console.error, null)

  function render(element: React.ReactNode): HostContainer {
    reconciler.updateContainer(element, root, null, undefined)
    return container
  }

  function createPortal(_element: React.ReactNode, _container: HostContainer): JSX.Element {
    // return <>{reconciler.createPortal(element, container, null, null)}</>
    return <></>
  }

  const resolved = new WeakMap<Promise<any>, boolean>()

  function suspend<T>(value: Promise<T>): T {
    if (resolved.get(value)) return value as T

    if (!resolved.has(value)) {
      resolved.set(value, false)
      value.then(() => resolved.set(value, true))
    }

    throw value
  }

  describe(suite, () => {
    it('should go through lifecycle', async () => {
      const lifecycle: string[] = []

      function Test() {
        React.useState(() => lifecycle.push('useState'))
        const ref = React.useRef<any>()
        ref.current ??= lifecycle.push('render')
        React.useImperativeHandle(ref, () => void lifecycle.push('ref'))
        React.useLayoutEffect(() => void lifecycle.push('useLayoutEffect'), [])
        React.useEffect(() => void lifecycle.push('useEffect'), [])
        return null
      }
      let container!: HostContainer
      await act(async () => void (container = render(<Test />)))

      expect(lifecycle).toStrictEqual([
        'useState',
        'render',
        // TODO: call during diffing
        // 'useInsertionEffect',
        'ref',
        'useLayoutEffect',
        'useEffect',
      ])
      expect(container.head).toBe(null)
    })

    it('should render JSX', async () => {
      let container!: HostContainer

      // Mount
      await act(async () => void (container = render(<element key={1} foo />)))
      expect(container.head).toStrictEqual({ type: 'element', props: { foo: true }, children: [] })

      // Remount
      await act(async () => void (container = render(<element bar />)))
      expect(container.head).toStrictEqual({ type: 'element', props: { bar: true }, children: [] })

      // Mutate
      await act(async () => void (container = render(<element foo />)))
      expect(container.head).toStrictEqual({ type: 'element', props: { foo: true }, children: [] })

      // Child mount
      await act(async () => {
        container = render(
          <element foo>
            <element />
          </element>,
        )
      })
      expect(container.head).toStrictEqual({
        type: 'element',
        props: { foo: true },
        children: [{ type: 'element', props: {}, children: [] }],
      })

      // Child unmount
      await act(async () => void (container = render(<element foo />)))
      expect(container.head).toStrictEqual({ type: 'element', props: { foo: true }, children: [] })

      // Unmount
      await act(async () => void (container = render(<></>)))
      expect(container.head).toBe(null)
    })

    it('should render text', async () => {
      let container!: HostContainer

      // Mount
      await act(async () => void (container = render(<>one</>)))
      expect(container.head).toStrictEqual({ type: 'text', props: { value: 'one' }, children: [] })

      // Remount
      await act(async () => void (container = render(<>one</>)))
      expect(container.head).toStrictEqual({ type: 'text', props: { value: 'one' }, children: [] })

      // Mutate
      await act(async () => void (container = render(<>two</>)))
      expect(container.head).toStrictEqual({ type: 'text', props: { value: 'two' }, children: [] })

      // Unmount
      await act(async () => void (container = render(<></>)))
      expect(container.head).toBe(null)
    })

    it('can handle suspense', async () => {
      let prerenders = 0
      let postrenders = 0
      const promise = Promise.resolve()
      const Test = () => (prerenders++, suspend(promise), postrenders++, (<element bar />))

      const container = await act(async () => render(<Test />))
      expect(container.head).toStrictEqual({ type: 'element', props: { bar: true }, children: [] })
      expect(prerenders).toBe(2)
      expect(postrenders).toBe(1)
    })

    it.skip('can handle portals', async () => {
      const portalContainer: HostContainer = { head: null }
      const container = await act(async () => render(createPortal(<element />, portalContainer)))
      expect(container.head).toBe(null)
      expect(portalContainer.head).toStrictEqual({ type: 'element', props: {}, children: [] })
    })
  })
}
