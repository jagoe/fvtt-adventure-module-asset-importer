import { Result } from '@/shared/models/Result'
import { readdir } from 'node:fs/promises'

export const tryReadDir = async (path: string): Promise<Result<string[]>> => {
  try {
    return { value: await readdir(path) }
  } catch (err) {
    return { error: { message: `Could not open "${path}"`, details: err } }
  }
}
