import { ImporterSettings } from '@shared/models'
import { ChangeEvent, useCallback, useState } from 'react'

export type ImporterSettingsFormParams = {
  settings: ImporterSettings
  onChange: (settings: ImporterSettings) => void
}

export default function ImporterSettingsForm({ settings, onChange }: ImporterSettingsFormParams) {
  const toggleSaveToNewModuleFlag = () => {
    const newFlag = !settings.saveToNewModule

    updateSettings({ saveToNewModule: newFlag })
  }

  const updateNewModuleName = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    updateSettings({ newModuleName: newValue })
  }

  const updateSettings = useCallback(
    (newSettings: Partial<ImporterSettings>) => {
      const updatedSettings = { ...settings, ...newSettings }
      onChange(updatedSettings)
    },
    [settings],
  )

  return (
    <>
      <label htmlFor='saveToNewModule'>
        <input
          id='saveToNewModule'
          type='checkbox'
          checked={settings.saveToNewModule}
          onChange={toggleSaveToNewModuleFlag}
        />
        Create a new module instead of overwriting the existing one?
      </label>
      {settings.saveToNewModule && (
        <div>
          <label>
            New module name
            <input value={settings.newModuleName} onChange={updateNewModuleName} />
          </label>
        </div>
      )}
    </>
  )
}
