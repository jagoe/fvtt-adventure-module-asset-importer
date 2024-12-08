import { Result, AdventureModuleAssetsResult } from './shared/models'

export type File = {
  selectDirectory: () => Promise<string | null>
}

export type FVTT = {
  getExternalAssets: (adventureModulePath: string) => Promise<AdventureModuleAssetsResult>
}

declare global {
  const file: File
  const fvtt: FVTT
}
