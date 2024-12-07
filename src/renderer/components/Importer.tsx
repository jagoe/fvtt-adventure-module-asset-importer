import { useCallback, useState } from 'react'

export default function Importer() {
  const [moduleDirectory, setModuleDirectory] = useState('')

  // Make this react-ive
  const selectModuleDirectory = useCallback(async () => {
    const moduleDirectory = await file.selectDirectory()

    if (!moduleDirectory) {
      return
    }

    setModuleDirectory(moduleDirectory)
  }, [])

  return (
    <>
      <button onClick={selectModuleDirectory}>Select adventure module directory</button>
      <span>{moduleDirectory}</span>
    </>
  )
}
