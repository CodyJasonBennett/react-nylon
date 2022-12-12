import type { Reducer, Key, Ref, ReactNode } from 'react'

export interface Queue {
  pending: Hook | null
  lastRenderedReducer: Reducer<any, any>
  lastRenderedState: any
}

export interface Effect {
  tag: number
  create: Function
  destroy: Function | undefined
  deps: any[] | null
}

export interface Hook {
  action?: any
  memoizedState: any
  queue: Queue | null
  next: Hook | null
}

export interface Fiber<P = any> {
  key?: Key
  ref?: Ref<any>
  index?: number
  type?: string | symbol | Function
  tag: number
  props?: any
  return?: Fiber<P>
  sibling?: Fiber<P>
  child?: Fiber<P>
  alternate?: Fiber<P>
  effectTag?: number | null
  stateNode?: P | null
  siblingNode?: P | null
  hook?: Hook
  effect?: Effect[] | null
}

export interface Root {
  render(element: ReactNode): void
  unmount(): void
}

export interface HostConfig<Type, Props, Container, PublicInstance, Instance, TextInstance> {
  createInstance(type: Type, props: Props, fiber: Fiber): Instance
  commitUpdate(instance: Instance, oldProps: Props, newProps: Props, fiber: Fiber): void
  createTextInstance(text: string, fiber: Fiber): TextInstance
  commitTextUpdate(textInstance: TextInstance, oldText: string, newText: string, fiber: Fiber): void
  getPublicInstance(instance: Instance): PublicInstance
  appendChild(parentInstance: Instance, childInstance: Instance | TextInstance): void
  insertBefore(parentInstance: Instance, child: Instance | TextInstance, beforeChild: Instance | TextInstance): void
  removeChild(parentInstance: Instance, childInstance: Instance | TextInstance): void
}
