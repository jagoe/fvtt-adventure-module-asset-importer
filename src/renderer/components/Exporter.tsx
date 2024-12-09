import { AssetList } from '@shared/models/AssetList'
import { Error } from '@shared/models/Error'
import { useCallback, useState } from 'react'

export default function Exporter() {
  const [adventureModulePath, setAdventureModulePath] = useState('')
  const [assetList, setAssetList] = useState<AssetList>(null)
  const [saveToNewModule, setSaveToNewModule] = useState(false)
  const [newModuleName, setNewModuleName] = useState('')
  const [error, setError] = useState<Error>()
  const [message, setMessage] = useState<string>()

  const selectModuleDirectory = useCallback(async () => {
    const adventureModulePath = await file.selectDirectory()

    if (!adventureModulePath) {
      return
    }

    // TODO: This should init - this way, we can do the setup in one step and separate all the other stuff

    setAdventureModulePath(adventureModulePath)
  }, [])

  const getExternalAssets = useCallback(async () => {
    const { error, assets } = await fvtt.getExternalAssets({ adventureModulePath, newModuleName })

    if (error) {
      setError(error)
      console.error(error, error.details)

      return
    }

    setAssetList(assets)
  }, [adventureModulePath, newModuleName])

  const importExternalAssets = useCallback(async () => {
    await fvtt.importExternalAssets()

    if (error) {
      setError(error)
      console.error(error, error.details)

      return
    }

    setMessage('Import successful')
  }, [adventureModulePath, newModuleName])

  return (
    <>
      <button onClick={selectModuleDirectory}>Select adventure module directory</button>
      <div>{adventureModulePath}</div>
      {adventureModulePath && (
        <>
          <label htmlFor='saveToNewModule'>
            Create a new module instead of overwriting the existing one?
            <input
              id='saveToNewModule'
              type='checkbox'
              checked={saveToNewModule}
              onChange={() => setSaveToNewModule(!saveToNewModule)}
            />
          </label>
          {saveToNewModule && <input value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} />}
          <button onClick={getExternalAssets}>Show external assets</button>
        </>
      )}
      {assetList && (
        <>
          <ul>
            {assetList.map((entity) => (
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
          <button onClick={importExternalAssets}>Import assets</button>
        </>
      )}
      {message && <div>{message}</div>}
      {error && <div>{error.message}</div>}

      {/* TODO: Progress bar or similar */}
      {/* TODO: Init session when selecting module - temp dir name will be ID */}
      {/* TODO: Flexibly change settings */}
      {/* TODO: Inspection & import should be done independently of each other */}
      {/* TODO: Inspection should be in a toggleable tab */}
      {/* TODO: Auto-update inspection after import */}
      {/* TODO: Success/error messages as toast */}
      {/* TODO: Styling - MUI or sth? */}
    </>
  )
}
