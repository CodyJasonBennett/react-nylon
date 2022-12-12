import * as React from 'react'
import { createRoot, type HostConfig } from 'react-nylon'

type Instance = HTMLElement
type TextInstance = Text

function applyProps<T extends Instance>(instance: T, oldProps: any, newProps: any): T {
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

const config: HostConfig<string, any, HTMLElement, Instance, Instance, TextInstance> = {
  createInstance(type, props) {
    return applyProps(document.createElement(type), {}, props)
  },
  commitUpdate(instance, oldProps, newProps, fiber) {
    applyProps(instance, oldProps, newProps)
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
  appendChild(parentInstance, childInstance) {
    parentInstance.appendChild(childInstance)
  },
  insertBefore(parentInstance, child, beforeChild) {
    parentInstance.insertBefore(child, beforeChild)
  },
  removeChild(parentInstance, childInstance) {
    parentInstance.removeChild(childInstance)
  },
}

let i = 1

function App() {
  const id = React.useMemo(() => i++, [])
  const [count, setCount] = React.useState(0)
  React.useEffect(() => console.log({ id, count }), [id, count])
  return <h1 onClick={() => setCount((v) => v + 1)}>Hello from renderer {id}</h1>
}

await Promise.all(
  ['root', 'root2', 'root3'].map(async (id) => {
    createRoot(document.getElementById(id)!, config).render(<App />)
  }),
)
