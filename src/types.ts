import type * as React from 'react'

export interface Queue {
  pending: Hook | null
  lastRenderedReducer: React.Reducer<any, any>
  lastRenderedState: any
}

export interface Effect {
  tag: number
  create: Function
  destroy: Function | undefined
  deps: React.DependencyList | null
}

export interface Hook {
  action?: any
  memoizedState: any
  queue: Queue | null
  next: Hook | null
}

export interface Fiber<P = any> {
  key?: React.Key
  ref?: React.Ref<any>
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
  render(element: React.ReactNode): void
  unmount(): void
}

export interface HostConfig<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
> {
  createInstance(
    type: Type,
    props: Props,
    rootContainer: Container,
    hostContext: HostContext,
    internalHandle: Fiber,
  ): Instance
  createTextInstance(
    text: string,
    rootContainer: Container,
    hostContext: HostContext,
    internalHandle: Fiber,
  ): TextInstance
  appendInitialChild(parent: Instance, child: Instance | TextInstance): void
  finalizeInitialChildren(
    instance: Instance,
    type: Type,
    props: Props,
    rootContainer: Container,
    hostContext: HostContext,
  ): boolean
  prepareUpdate(
    instance: Instance,
    type: Type,
    oldProps: Props,
    newProps: Props,
    rootContainer: Container,
    hostContext: HostContext,
  ): UpdatePayload | null
  shouldSetTextContent(type: Type, props: Props): boolean
  getRootHostContext(rootContainer: Container): HostContext | null
  getChildHostContext(parentHostContext: HostContext, type: Type, rootContainer: Container): HostContext
  getPublicInstance(instance: Instance): PublicInstance
  prepareForCommit(containerInfo: Container): Record<string, any> | null
  resetAfterCommit(containerInfo: Container): void
  preparePortalMount(containerInfo: Container): void
  appendChild?(parent: Instance, child: Instance | TextInstance): void
  appendChildToContainer?(container: Container, child: Instance | TextInstance): void
  insertBefore?(parent: Instance, child: Instance | TextInstance, beforeChild: Instance | TextInstance): void
  insertInContainerBefore?(
    container: Container,
    child: Instance | TextInstance,
    beforeChild: Instance | TextInstance,
  ): void
  removeChild?(parent: Instance, child: Instance | TextInstance): void
  removeChildFromContainer?(container: Container, child: Instance | TextInstance): void
  resetTextContent?(instance: Instance): void
  commitTextUpdate?(textInstance: TextInstance, oldText: string, newText: string): void
  commitMount?(instance: Instance, type: Type, props: Props, internalHandle: Fiber): void
  commitUpdate?(
    instance: Instance,
    updatePayload: UpdatePayload,
    type: Type,
    prevProps: Props,
    nextProps: Props,
    internalHandle: Fiber,
  ): void
  hideInstance?(instance: Instance): void
  hideTextInstance?(textInstance: TextInstance): void
  unhideInstance?(instance: Instance, props: Props): void
  unhideTextInstance?(textInstance: TextInstance, text: string): void
  clearContainer?(container: Container): void
}

// Unimplemented:
// appendInitialChild
// shouldSetTextContent
// prepareForCommit, resetAfterCommit
// resetTextContent, clearContainer
// portals
