import { EntityModuleAssets } from './EntityModuleAssets'
import { Result } from '../../shared/models/Result'

export type PackModuleAssets = {
  [jsonFile: string]: EntityModuleAssets
}

export type PackModuleAssetsResult = Result<PackModuleAssets, 'assets'>
