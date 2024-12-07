import { ipcMain } from 'electron'
import { IpcSignatures } from '../shared/models/IpcSignatures'
import { selectDirectory } from './selectDirectory'

export const registerIpcHandlers = () => {
  ipcMain.handle(IpcSignatures.selectDirectory, selectDirectory)
}
