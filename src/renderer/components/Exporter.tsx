import { useCallback, useState } from 'react'

export default function Exporter() {
  const [moduleDirectory, setModuleDirectory] = useState('')

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
      // TODO: Display
      console.error(error)
    }

    // TODO: Display
    console.log(assets)
  }, [moduleDirectory])

  return (
    <>
      <button onClick={selectModuleDirectory}>Select adventure module directory</button>
      <div>{moduleDirectory}</div>
      {moduleDirectory && <button onClick={getExternalAssets}>Show external assets</button>}

      {/* TODO: Confirm export - optionally to new location instead of making backup? */}
      {/* TODO: Progress bar or similar */}
      {/* TODO: Success/error message */}
      {/* TODO: Styling */}
    </>
  )
}
