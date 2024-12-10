import { AssetList, Error, ImportDetails, ImporterSettings } from '@shared/models'
import { useCallback, useState } from 'react'
import AssetMappings from './AssetMappings'
import ImporterSettingsForm from './ImporterSettingsForm'
import ImportDetailList from './ImportDetailList'

const defaultSettings: ImporterSettings = { saveToNewModule: false, newModuleName: '' }
const defaultAssetList: AssetList = null
const defaultImportDetails: ImportDetails[] = []
const defaultError: Error = null
const defaultMessage: string = null

export default function Importer() {
  const [adventureModulePath, setAdventureModulePath] = useState('')
  const [settings, setSettings] = useState<ImporterSettings>({ ...defaultSettings })
  const [assetList, setAssetList] = useState<AssetList>(defaultAssetList)
  const [importDetails, setImportDetails] = useState<ImportDetails[]>(defaultImportDetails)
  const [error, setError] = useState<Error>(defaultError)
  const [message, setMessage] = useState<string>(defaultMessage)

  const handleError = (error: Error) => {
    setError(error)
    console.error(error, error.details)
  }

  const resetState = () => {
    setSettings({ ...defaultSettings })
    setAssetList(defaultAssetList)
    setImportDetails(defaultImportDetails)
    setError(defaultError)
    setMessage(defaultMessage)
  }

  const selectModuleDirectory = useCallback(async () => {
    const adventureModulePath = await file.selectDirectory()

    if (!adventureModulePath) {
      return
    }

    resetState()
    setAdventureModulePath(adventureModulePath)

    const { error } = await fvtt.initialize({ adventureModulePath })
    if (error) {
      handleError(error)
      return
    }
  }, [])

  const updateSettings = useCallback(
    async (newSettings: ImporterSettings) => {
      setSettings(newSettings)

      const { error } = fvtt.configureImporter({ settings: newSettings })
      if (error) {
        handleError(error)
      }
    },
    [adventureModulePath, settings],
  )

  const getExternalAssets = useCallback(async () => {
    const { error, value: assets } = await fvtt.getExternalAssets()

    if (error) {
      handleError(error)
      return
    }

    setAssetList(assets)
  }, [adventureModulePath, settings])

  const importExternalAssets = useCallback(async () => {
    const { error, value: importDetails } = await fvtt.importExternalAssets()

    if (error) {
      handleError(error)
      return
    }

    setImportDetails(importDetails)
    setMessage('Import successful')
  }, [adventureModulePath, settings])

  const moduleName =
    settings.saveToNewModule && settings.newModuleName
      ? settings.newModuleName
      : adventureModulePath.split(/[\/\\]/).pop()

  return (
    <>
      <section>
        <h3>Pick adventure module directory</h3>
        <button onClick={selectModuleDirectory}>Select adventure module directory</button>
        {adventureModulePath && (
          <div>
            You picked <code>{adventureModulePath}</code>
          </div>
        )}
      </section>
      {adventureModulePath && (
        <>
          <section>
            <h3>Settings</h3>
            <ImporterSettingsForm settings={settings} onChange={updateSettings} />
          </section>
          <section>
            <h3>Show current external assets</h3>
            <button onClick={getExternalAssets}>Show external assets</button>
            {assetList && <AssetMappings assets={assetList} />}
          </section>
          <section>
            <h3>
              Import external assets into module <code>{moduleName}</code>
            </h3>
            <button onClick={importExternalAssets}>Import assets</button>
            {!!importDetails.length && <ImportDetailList details={importDetails} />}
          </section>
        </>
      )}
      {message && <div>{message}</div>}
      {error && <div>{error.message}</div>}
      {/* TODO: Success/error messages as toast or notification */}
      {/* TODO: Use some UI lib, create stepper/wizard? */}
    </>
  )
}
