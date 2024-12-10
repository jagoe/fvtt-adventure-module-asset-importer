import { Fail, Ok, Result } from '@shared/models'
import { readdir } from 'node:fs/promises'

export const tryReadDir = async (path: string): Promise<Result<string[]>> => {
  try {
    return Ok(await readdir(path))
  } catch (err) {
    return Fail(`Could not open "${path}"`, err)
  }
}
