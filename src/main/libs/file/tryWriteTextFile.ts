import { Fail, Ok, Result } from '@shared/models'
import { writeFile } from 'node:fs/promises'

export const tryWriteTextFile = async (path: string, content: string): Promise<Result<never>> => {
  try {
    await writeFile(path, content)

    return Ok()
  } catch (err) {
    return Fail(`Unable to read file "${path}"`, err)
  }
}
