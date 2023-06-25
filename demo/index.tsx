import * as React from 'react'
import { Reconciler } from 'react-nylon'

interface HostConfig {
  type: string
  props: Record<string, any>
  container: HTMLElement
  instance: HTMLElement
  textInstance: Text
  suspenseInstance: never
  hydratableInstance: never
  publicInstance: HTMLElement
  hostContext: null
  updatePayload: void
  childSet: never
  timeoutHandle: number
  noTimeout: -1
}

function applyProps<T extends HostConfig['instance']>(
  instance: T,
  oldProps: HostConfig['props'],
  newProps: HostConfig['props'],
): T {
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
  appendInitialChild(parent, child) {
    parent.appendChild(child)
  },
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
  // Unimplemented
  shouldSetTextContent(type, props) {
    return true
  },
  getRootHostContext(rootContainer) {
    return null
  },
  getChildHostContext(parentHostContext, type, rootContainer) {
    return null
  },
  prepareForCommit(containerInfo) {
    return null
  },
  resetAfterCommit(containerInfo) {},
  resetTextContent(instance) {},
  hideInstance(instance) {},
  hideTextInstance(textInstance) {},
  unhideInstance(instance, props) {},
  unhideTextInstance(textInstance, text) {},
  clearContainer(container) {},
  preparePortalMount(containerInfo) {},
})

let i = 1

function App() {
  const id = React.useMemo(() => i++, [])
  const [count, setCount] = React.useState(0)
  React.useEffect(() => console.log({ id, count }), [id, count])
  return <h1 onClick={() => setCount((v) => v + 1)}>Hello from renderer {id}</h1>
}

await Promise.all(
  ['root', 'root2', 'root3'].map(async (id) => {
    const container = document.getElementById(id)!
    const root = reconciler.createContainer(container, 1, null, false, null, '', console.error, null)
    reconciler.updateContainer(<App />, root, null, undefined)
  }),
)
