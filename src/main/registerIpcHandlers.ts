import { ipcMain } from 'electron'
import { IpcIdentifiers } from '@shared/models/IpcSignatures'
import { selectDirectory } from './handlers/selectDirectory'
import { FvttModuleAssetExporter } from './libs/FvttModuleExporter'
import { AssetListResult } from '@shared/models/AssetList'
import { mapAssetList } from './mappers/mapAssetList'

export const registerIpcHandlers = () => {
  ipcMain.handle(IpcIdentifiers.selectDirectory, () => {
    console.debug(`Received IPC call from renderer: ${IpcIdentifiers.selectDirectory}()`)

    return selectDirectory()
  })

  ipcMain.handle(
    IpcIdentifiers.getExternalAssets,
    async (
      _event,
      { adventureModulePath, newModuleName }: { adventureModulePath: string; newModuleName: string },
    ): Promise<AssetListResult> => {
      console.debug(
        `Received IPC call from renderer: ${IpcIdentifiers.getExternalAssets}(adventureModulePath: ${adventureModulePath}, newModuleName: ${newModuleName})`,
      )

      console.debug(`${IpcIdentifiers.getExternalAssets}: Initializing exporter`)

      const exporter = FvttModuleAssetExporter.create()

      const { error: initError } = await exporter.init(adventureModulePath, newModuleName)
      if (initError) {
        return { error: initError }
      }

      console.debug(`${IpcIdentifiers.getExternalAssets}: Extracting module`)

      const { error: extractionError } = await exporter.extractModule()
      if (extractionError) {
        return { error: extractionError }
      }

      console.debug(`${IpcIdentifiers.getExternalAssets}: Retrieving external assets`)

      const { error: findAssetsError, assets } = await exporter.findExternalAssets()
      if (findAssetsError) {
        return { error: findAssetsError }
      }

      console.debug(`${IpcIdentifiers.getExternalAssets}: Retrieved external assets`)

      const result = { assets: mapAssetList(assets) }

      console.debug(`${IpcIdentifiers.getExternalAssets}: Returning result`, result)

      return { assets: mapAssetList(assets) }
    },
  )

  ipcMain.handle(IpcIdentifiers.importExternalAssets, async (_event) => {
    console.debug(`Received IPC call from renderer: ${IpcIdentifiers.importExternalAssets}()`)

    const exporter = FvttModuleAssetExporter.create()

    console.debug(`${IpcIdentifiers.importExternalAssets}: Starting import`)

    const { error } = await exporter.importExternalAssets()

    console.debug(`${IpcIdentifiers.importExternalAssets}: Finished import${error && ' with errors'}`)

    if (error) {
      return { error }
    }

    return {}
  })
}
