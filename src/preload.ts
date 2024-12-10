// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import { IpcSignatures, IpcCall, PreloadSignature } from '@shared/models'

// File

const selectDirectory: PreloadSignature<IpcSignatures.File.selectDirectory> = () =>
  invoke<IpcSignatures.File.selectDirectory>('selectDirectory')

const fileApi = {
  selectDirectory,
}

export type FileApi = typeof fileApi

contextBridge.exposeInMainWorld('file', fileApi)

// FVTT

const initialize: PreloadSignature<IpcSignatures.FVTT.initialize> = (params) =>
  invoke<IpcSignatures.FVTT.initialize>('initialize', params)

const configureImporter: PreloadSignature<IpcSignatures.FVTT.configureImporter> = (params) =>
  invoke<IpcSignatures.FVTT.configureImporter>('configureImporter', params)

const getExternalAssets: PreloadSignature<IpcSignatures.FVTT.getExternalAssets> = (params) =>
  invoke<IpcSignatures.FVTT.getExternalAssets>('getExternalAssets', params)

const importExternalAssets: PreloadSignature<IpcSignatures.FVTT.importExternalAssets> = (params) =>
  invoke<IpcSignatures.FVTT.importExternalAssets>('importExternalAssets', params)

const fvttApi = {
  initialize,
  configureImporter,
  getExternalAssets,
  importExternalAssets,
}

export type FvttApi = typeof fvttApi

contextBridge.exposeInMainWorld('fvtt', fvttApi)

// Plumbing

const invoke = <T extends IpcCall>(identifier: T['identifier'], params?: T['params']): T['returnType'] =>
  ipcRenderer.invoke(identifier, params)
