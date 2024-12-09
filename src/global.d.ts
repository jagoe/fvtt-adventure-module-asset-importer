import { Result, AssetListResult } from './shared/models'

export type File = {
  selectDirectory: () => Promise<string | null>
}

export type FVTT = {
  getExternalAssets: (options: { adventureModulePath: string; newModuleName: string }) => Promise<AssetListResult>
  importExternalAssets: () => Promise<Result<void>>
}

declare global {
  const file: File
  const fvtt: FVTT
}
