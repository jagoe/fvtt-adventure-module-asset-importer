import { AssetList } from '@shared/models/AssetList'
import { Error } from '@shared/models/Error'
import { useCallback, useState } from 'react'

export default function Exporter() {
  const [moduleDirectory, setModuleDirectory] = useState('')
  const [assetList, setAssetList] = useState<AssetList>([])
  const [error, setError] = useState<Error>()

  const selectModuleDirectory = useCallback(async () => {
    const moduleDirectory = await file.selectDirectory()

    if (!moduleDirectory) {
      return
    }

    setModuleDirectory(moduleDirectory)
  }, [])

  const getExternalAssets = useCallback(async () => {
    const { error, assets } = await fvtt.getExternalAssets(moduleDirectory)

    if (error) {
      setError(error)
      console.log(error, error.details)
    }

    setAssetList(assets)
  }, [moduleDirectory])

  return (
    <>
      <button onClick={selectModuleDirectory}>Select adventure module directory</button>
      <div>{moduleDirectory}</div>
      {moduleDirectory && <button onClick={getExternalAssets}>Show external assets</button>}
      {assetList && (
        <ul>
          {assetList.map((entity) => (
            <li key={entity.type}>
              {entity.type}
              <ul>
                {entity.assets.map((asset) => (
                  <li>{asset}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {error && <div>{error.message}</div>}

      {/* TODO: Confirm export - optionally to new location instead of making backup? */}
      {/* TODO: Progress bar or similar */}
      {/* TODO: Success/error message */}
      {/* TODO: Styling */}
    </>
  )
}
