// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import { IpcSignatures } from './shared/models/IpcSignatures'

contextBridge.exposeInMainWorld('file', {
  selectDirectory: () => ipcRenderer.invoke(IpcSignatures.selectDirectory),
})
