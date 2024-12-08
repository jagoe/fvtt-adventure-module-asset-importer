import { ipcMain } from 'electron'
import { IpcIdentifiers } from '@/shared/models/IpcSignatures'
import { selectDirectory } from './handlers/selectDirectory'
import { FvttModuleAssetExporter } from './libs/FvttModuleExporter'
import { AdventureModuleAssetsResult } from '@/shared/models'

export const registerIpcHandlers = () => {
  ipcMain.handle(IpcIdentifiers.selectDirectory, selectDirectory)

  ipcMain.handle(
    IpcIdentifiers.getExternalAssets,
    async (_event, { adventureModulePath }: { adventureModulePath: string }): Promise<AdventureModuleAssetsResult> => {
      FvttModuleAssetExporter.create()

      const { error: initError } = await FvttModuleAssetExporter.Instance.init(adventureModulePath)
      if (initError) {
        return { error: initError }
      }

      const { error: extractionError } = await FvttModuleAssetExporter.Instance.extractModule()
      if (extractionError) {
        return { error: extractionError }
      }

      const { error: findAssetsError, assets } = await FvttModuleAssetExporter.Instance.findExternalAssets()
      if (findAssetsError) {
        return { error: findAssetsError }
      }

      return assets
    },
  )
}
