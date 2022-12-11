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

export const PLACEMENT = 4
export const UPDATE = 5
export const DELETION = 6

export const NOEFFECT = 7
export const EFFECT = 8
export const EFFECTONCE = 9
export const LAYOUT = 10
export const LAYOUTONCE = 11
