import { Error } from './Error'

export type Result<TValue> = {
  error?: Error
  value?: TValue
  isValid: boolean
}

export const Ok = <TValue>(value?: TValue): Result<TValue> => {
  return {
    ...(value === undefined ? {} : { value }),
    isValid: true,
  }
}

export const Fail = <TValue>(error: string | Error, details?: unknown): Result<TValue> => {
  let errorObject
  if (typeof error === 'string') {
    errorObject = { message: error, details }
  } else {
    errorObject = error
  }

  return {
    error: errorObject,
    isValid: false,
  }
}
