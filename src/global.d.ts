import { FileApi, FvttApi } from './preload'
import { PreloadSignatures } from './shared/models'

declare global {
  const file: FileApi
  const fvtt: FvttApi
}
