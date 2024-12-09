import { Result, AssetListResult } from './shared/models'

export type File = {
  selectDirectory: () => Promise<string | null>
}

export type FVTT = {
  getExternalAssets: (adventureModulePath: string) => Promise<AssetListResult>
}

declare global {
  const file: File
  const fvtt: FVTT
}
