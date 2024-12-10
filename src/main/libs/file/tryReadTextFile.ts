import { Fail, Ok, Result } from '@shared/models'
import { readFile } from 'node:fs/promises'

export const tryReadTextFile = async (path: string): Promise<Result<string>> => {
  try {
    const buffer = await readFile(path)
    return Ok(buffer.toString('utf-8'))
  } catch (err) {
    return Fail(`Unable to read file "${path}"`, err)
  }
}
