import * as React from 'react'
import { render } from '../src'

function App() {
  const [count, setCount] = React.useState(0)
  return (
    <>
      <h1>{count}</h1>
      <button onClick={() => setCount((v) => v + 1)}>+</button>
    </>
  )
}

type Instance = HTMLElement
type TextInstance = Text

render<string, any, HTMLElement, Instance, Instance, TextInstance>(<App />, document.getElementById('root')!, {
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
})

function applyProps<T extends Instance>(instance: T, oldProps: any, newProps: any): T {
  for (const key in { ...oldProps, ...newProps }) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]

    if (oldValue == newValue || key === 'children') continue

    if (key === 'style') {
      for (const k in { ...oldValue, ...newValue }) {
        if (oldValue?.[k] !== newValue?.[k]) {
          ;(instance[key] as any)[k] = newValue?.[k] ?? ''
        }
      }
    } else if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase()
      if (oldValue) instance.removeEventListener(event, oldValue)
      instance.addEventListener(event, newValue)
    } else if (key in instance && !(instance instanceof SVGElement)) {
      ;(instance as any)[key] = newValue ?? ''
    } else if (newValue == null) {
      instance.removeAttribute(key)
    } else {
      instance.setAttribute(key, newValue)
    }
  }

  return instance
}
