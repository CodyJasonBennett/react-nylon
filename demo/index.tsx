import * as React from 'react'
import { HostConfig, Reconciler } from 'react-nylon'

type Props = Record<string, any>

const config: HostConfig<
  string, // type
  Props, // props
  HTMLElement, // container
  HTMLElement, // instance
  Text, // textInstance
  HTMLElement, // suspenseInstance
  HTMLElement, // hydratableInstance
  HTMLElement, // publicInstance
  null, // hostConfig
  void, // updatePayload
  never, // childSet
  number, // timeoutHandle
  -1 // noTimeout
> = {
  createInstance(type, props) {
    return applyProps(document.createElement(type), {}, props)
  },
  createTextInstance(text) {
    return document.createTextNode(text)
  },
  commitTextUpdate(textInstance, oldText, newText) {
    textInstance.textContent = newText
  },
  getPublicInstance(instance) {
    return instance
  },
  // appendInitialChild(parent, child) {
  //   parent.appendChild(child)
  // },
  appendChild(parent, child) {
    parent.appendChild(child)
  },
  appendChildToContainer(container, child) {
    container.appendChild(child)
  },
  insertBefore(parent, child, beforeChild) {
    parent.insertBefore(child, beforeChild)
  },
  insertInContainerBefore(container, child, beforeChild) {
    container.insertBefore(child, beforeChild)
  },
  removeChild(parent, child) {
    parent.removeChild(child)
  },
  removeChildFromContainer(container, child) {
    container.removeChild(child)
  },
  prepareUpdate(instance, type, oldProps, newProps, rootContainer, hostContext) {},
  commitUpdate(instance, updatePayload, type, prevProps, nextProps, internalHandle) {
    applyProps(instance, prevProps, nextProps)
  },
  finalizeInitialChildren(instance, type, props, rootContainer, hostContext) {
    return false
  },
  commitMount(instance, type, props, internalHandle) {},
  preparePortalMount(containerInfo) {},
  // Unimplemented
  // shouldSetTextContent(type, props) {
  //   return true
  // },
  // getRootHostContext(rootContainer) {
  //   return null
  // },
  // getChildHostContext(parentHostContext, type, rootContainer) {
  //   return null
  // },
  // prepareForCommit(containerInfo) {
  //   return null
  // },
  // resetAfterCommit(containerInfo) {},
  // resetTextContent(instance) {},
  // hideInstance(instance) {},
  // hideTextInstance(textInstance) {},
  // unhideInstance(instance, props) {},
  // unhideTextInstance(textInstance, text) {},
  // clearContainer(container) {},
}

function applyProps<T extends HTMLElement>(instance: T, oldProps: Props, newProps: Props): T {
  for (const key in { ...oldProps, ...newProps }) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]

    if (Object.is(oldValue, newValue) || key === 'children') continue

    if (key === 'style') {
      for (const k in { ...oldValue, ...newValue } as CSSStyleDeclaration) {
        if (oldValue?.[k] !== newValue?.[k]) {
          instance.style[k] = newValue?.[k] ?? ''
        }
      }
    } else if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase()
      if (oldValue) instance.removeEventListener(event, oldValue)
      instance.addEventListener(event, newValue)
    } else if (newValue == null) {
      instance.removeAttribute(key)
    } else {
      instance.setAttribute(key, newValue)
    }
  }

  return instance
}

const context = React.createContext<number>(null!)

const primary = Reconciler(config)
const secondary = Reconciler(config)

function App() {
  const id = React.useId()
  const [count, setCount] = React.useState(0)
  const value = React.useContext(context)
  React.useEffect(() => console.log({ id, count, value }), [id, count, value])
  return <h1 onClick={() => setCount((v) => v + 1)}>Hello from renderer {id}</h1>
}

const root = primary.createContainer(document.getElementById('root1')!, 1, null, false, null, '', console.error, null)
primary.updateContainer(
  <>
    <App />
    <context.Provider value={Math.PI}>
      <App />
      {primary.createRoot(<App />, document.getElementById('root2')!)}
      {secondary.createRoot(
        <>
          <App />
          {primary.createRoot(<App />, document.getElementById('root4')!)}
        </>,
        document.getElementById('root3')!,
      )}
    </context.Provider>
  </>,
  root,
  null,
  undefined,
)
