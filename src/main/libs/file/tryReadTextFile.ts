import { Result } from '@shared/models/Result'
import { readFile } from 'node:fs/promises'

export const tryReadTextFile = async (path: string): Promise<Result<string>> => {
  try {
    const buffer = await readFile(path)
    const text = buffer.toString('utf-8')
    return { value: text }
  } catch (err) {
    return { error: { message: `Unable to read file "${path}"`, details: err } }
  }
}
