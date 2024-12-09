import { ipcMain } from 'electron'
import { IpcIdentifiers } from '@shared/models/IpcSignatures'
import { selectDirectory } from './handlers/selectDirectory'
import { FvttModuleAssetExporter } from './libs/FvttModuleExporter'
import { AssetListResult } from '@shared/models/AssetList'
import { mapAssetList } from './mappers/mapAssetList'

export const registerIpcHandlers = () => {
  ipcMain.handle(IpcIdentifiers.selectDirectory, selectDirectory)

  ipcMain.handle(
    IpcIdentifiers.getExternalAssets,
    async (_event, { adventureModulePath }: { adventureModulePath: string }): Promise<AssetListResult> => {
      console.debug(
        `Received IPC call from renderer: ${IpcIdentifiers.getExternalAssets}(adventureModulePath: ${adventureModulePath})`,
      )

      console.debug(`${IpcIdentifiers.getExternalAssets}: Initializing exporter`)

      FvttModuleAssetExporter.create()

      const { error: initError } = await FvttModuleAssetExporter.Instance.init(adventureModulePath)
      if (initError) {
        return { error: initError }
      }

      console.debug(`${IpcIdentifiers.getExternalAssets}: Extracting module`)

      const { error: extractionError } = await FvttModuleAssetExporter.Instance.extractModule()
      if (extractionError) {
        return { error: extractionError }
      }

      console.debug(`${IpcIdentifiers.getExternalAssets}: Retrieving external assets`)

      const { error: findAssetsError, assets } = await FvttModuleAssetExporter.Instance.findExternalAssets()
      if (findAssetsError) {
        return { error: findAssetsError }
      }

      console.debug(`${IpcIdentifiers.getExternalAssets}: Retrieved external assets`)

      const result = { assets: mapAssetList(assets) }

      console.debug(`${IpcIdentifiers.getExternalAssets}: Returning result`, result)

      return { assets: mapAssetList(assets) }
    },
  )
}
