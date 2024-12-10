import { unique } from '@main/libs/array/unique'
import { AdventureModuleAssets } from '@main/models'
import { AssetList } from '@shared/models'

export const mapAssetList = (assets: AdventureModuleAssets): AssetList => {
  const packAssets = Object.values(assets).flatMap((files) => Object.values(files).map((entities) => entities))

  return packAssets.reduce((result, current) => {
    Object.entries(current).forEach(([entity, assets]) => {
      let entityList = result.find((entry) => entry.entity === entity)

      if (!entityList) {
        entityList = { entity, assets: [] }
        result.push(entityList)
      }

      entityList.assets = unique([...entityList.assets, ...assets]) // TODO: Probably not unique
    })

    return result
  }, [] as AssetList)
}
