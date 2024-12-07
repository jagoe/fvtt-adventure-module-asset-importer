import { dialog } from 'electron'

export const selectDirectory = async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })

  if (result.canceled) {
    return null
  }

  return result.filePaths[0]
}
