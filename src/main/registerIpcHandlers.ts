import { ipcMain } from 'electron'
import { IpcCall, IpcSignatures } from '@shared/models'
import { selectDirectory } from './handlers/selectDirectory'
import { FvttModuleAssetImporter } from './libs/FvttModuleImporter'

export const registerIpcHandlers = () => {
  handle<IpcSignatures.File.selectDirectory>('selectDirectory', () => {
    return selectDirectory()
  })

  handle<IpcSignatures.FVTT.initialize>('initialize', (params) => {
    const importer = FvttModuleAssetImporter.Instance

    return importer.initialize(params.adventureModulePath)
  })

  handle<IpcSignatures.FVTT.configureImporter>('configureImporter', (params) => {
    const importer = FvttModuleAssetImporter.Instance

    return importer.configure(params.settings)
  })

  handle<IpcSignatures.FVTT.getExternalAssets>('getExternalAssets', () => {
    const importer = FvttModuleAssetImporter.Instance

    return importer.getExternalAssets()
  })

  handle<IpcSignatures.FVTT.importExternalAssets>('importExternalAssets', () => {
    const importer = FvttModuleAssetImporter.Instance

    return importer.importExternalAssets()
  })
}

// Plumbing

const handle = <T extends IpcCall>(
  identifier: T['identifier'],
  listener: (params?: T['params']) => T['returnType'],
): void => {
  console.debug(`Received IPC call from renderer: ${identifier}()`)

  ipcMain.handle(identifier, (_event, params) => listener(params))
}
