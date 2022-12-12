import * as React from 'react'
import { createRoot, type HostConfig } from '../src'

function App() {
  const [count, setCount] = React.useState(0)
  const ref = React.useRef<HTMLButtonElement>(null!)
  React.useState(() => console.log('useState'))
  React.useMemo(() => console.log('useMemo'), [])
  React.useImperativeHandle(React.useRef(), () => void console.log('useImperativeHandle'))
  React.useCallback(() => console.log('useCallback'), [])
  React.useCallback(() => console.log('useCallback with Update'), [count])
  React.useInsertionEffect(() => console.log('useInsertionEffect'), [])
  React.useInsertionEffect(() => console.log('useInsertionEffect with update'), [count])
  React.useTransition()
  React.useSyncExternalStore(null!, null!)
  React.useLayoutEffect(() => console.log('useLayoutEffect'), [])
  React.useLayoutEffect(() => console.log('useLayoutEffect with update'), [count])
  React.useEffect(() => console.log('useEffect'), [])
  React.useEffect(() => console.log('useEffect with update'), [count])
  console.log('render')
  return (
    <>
      <h1 ref={React.useCallback((ref: any) => console.log('ref', ref), [])}>{count}</h1>
      <button ref={ref} onClick={() => setCount((v) => v + 1)}>
        +
      </button>
    </>
  )
}

type Instance = HTMLElement
type TextInstance = Text

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

createRoot(document.getElementById('root')!, config).render(<App />)
