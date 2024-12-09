import { Result } from '@shared/models/Result'
import { readFile } from 'node:fs/promises'

export const tryReadJsonFile = async (path: string): Promise<Result<unknown>> => {
  try {
    const buffer = await readFile(path)
    const text = buffer.toString('utf-8')
    return { value: JSON.parse(text) }
  } catch (err) {
    return { error: { message: `Unable to read file "${path}"`, details: err } }
  }
}
