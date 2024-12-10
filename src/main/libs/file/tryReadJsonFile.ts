import { Fail, Ok, Result } from '@shared/models'
import { readFile } from 'node:fs/promises'

export const tryReadJsonFile = async (path: string): Promise<Result<unknown>> => {
  try {
    const buffer = await readFile(path)
    const text = buffer.toString('utf-8')
    return Ok(JSON.parse(text))
  } catch (err) {
    return Fail(`Unable to read file "${path}"`, err)
  }
}
