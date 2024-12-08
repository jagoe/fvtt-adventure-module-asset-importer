import { Result } from './Result'
import { PackModuleAssets } from './PackModuleAssets'

export type AdventureModuleAssets = {
  [pack: string]: PackModuleAssets
}

export type AdventureModuleAssetsResult = Result<AdventureModuleAssets, 'assets'>
