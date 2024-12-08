export type Result<TValue, TValueName extends string = 'value'> = { [P in TValueName]?: TValue } & {
  error?: { message: string; details?: unknown }
}
