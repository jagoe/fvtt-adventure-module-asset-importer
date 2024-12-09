// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import { IpcIdentifiers } from './shared/models/IpcSignatures'

contextBridge.exposeInMainWorld('file', {
  selectDirectory: () => ipcRenderer.invoke(IpcIdentifiers.selectDirectory),
})

contextBridge.exposeInMainWorld('fvtt', {
  getExternalAssets: (options: { adventureModulePath: string; newModuleName: string }) =>
    ipcRenderer.invoke(IpcIdentifiers.getExternalAssets, options),
  importExternalAssets: () => ipcRenderer.invoke(IpcIdentifiers.importExternalAssets),
})
