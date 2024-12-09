import { unique } from '@main/libs/array/unique'
import { AdventureModuleAssets } from '@shared/models'
import { AssetList } from '@shared/models/AssetList'

export const mapAssetList = (assets: AdventureModuleAssets): AssetList => {
  const packAssets = Object.values(assets).flatMap((files) => Object.values(files).map((entities) => entities))

  return packAssets.reduce((result, current) => {
    Object.entries(current).forEach(([entity, assets]) => {
      let entityList = result.find((entry) => entry.type === entity)

      if (!entityList) {
        entityList = { type: entity, assets: [] }
        result.push(entityList)
      }

      entityList.assets = unique([...entityList.assets, ...assets])
    })

    return result
  }, [] as AssetList)
}
