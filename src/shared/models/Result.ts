import { Error } from './Error'

type ValueResult<TValue, TValueName extends string = 'value'> = {
  [P in TValueName]?: TValue
}

type ErrorResult = {
  error?: Error
}

export type Result<TValue, TValueName extends string = 'value'> = ValueResult<TValue, TValueName> & ErrorResult
