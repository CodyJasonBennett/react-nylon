import * as React from 'react'
import type { HostConfig } from './types'

export const { ReactCurrentDispatcher } = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
export const ReactCurrentHostConfig = { current: null! } as React.MutableRefObject<
  HostConfig<any, any, any, any, any, any>
>

export const HostRoot = 0
export const FunctionComponent = 1
export const HostComponent = 2
export const HostText = 3

export const PLACEMENT = 0
export const UPDATE = 1
export const DELETION = 2

export const NOEFFECT = 9
export const EFFECT = 1
export const EFFECTONCE = 2
export const LAYOUT = 3
export const LAYOUTONCE = 4
