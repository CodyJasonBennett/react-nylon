import { Reconciler } from 'react-nylon'

function applyProps(instance, oldProps, newProps) {
  for (const key in { ...oldProps, ...newProps }) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]

    if (Object.is(oldValue, newValue) || key === 'children') continue

    if (key === 'style') {
      for (const k in { ...oldValue, ...newValue }) {
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

const reconciler = Reconciler({
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
})

export function createRoot(container) {
  const root = reconciler.createContainer(container)
  return {
    render(element) {
      reconciler.updateContainer(element, root, null, undefined)
    },
    unmount() {
      return this.render(null)
    },
  }
}
