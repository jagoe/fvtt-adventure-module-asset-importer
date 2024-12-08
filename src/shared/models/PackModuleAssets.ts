import { EntityModuleAssets } from './EntityModuleAssets'
import { Result } from './Result'

export type PackModuleAssets = {
  [jsonFile: string]: EntityModuleAssets
}

export type PackModuleAssetsResult = Result<PackModuleAssets, 'assets'>
