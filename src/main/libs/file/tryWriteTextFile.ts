import { Result } from '@shared/models/Result'
import { writeFile } from 'node:fs/promises'

export const tryWriteTextFile = async (path: string, content: string): Promise<Result<void>> => {
  try {
    await writeFile(path, content)

    return {}
  } catch (err) {
    return { error: { message: `Unable to read file "${path}"`, details: err } }
  }
}
