import { AssetList } from '@shared/models'

export type AssetListParams = {
  assets: AssetList
}

export default function AssetMappings({ assets }: AssetListParams) {
  return (
    <>
      <ul>
        {assets.map((entity) => (
          <li key={entity.entity}>
            {entity.entity}
            <ul>
              {entity.assets.map((asset) => (
                <li key={asset.originalPath}>
                  {asset.originalPath} ⇒ {asset.internalPath}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {!assets.length && <>No external assets found</>}
    </>
  )
}
