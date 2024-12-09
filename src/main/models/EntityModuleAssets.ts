import { AssetInfo } from '@shared/models'
import { Result } from '../../shared/models/Result'

export type EntityModuleAssets = {
  [entity: string]: AssetInfo[]
}

export type EntityModuleAssetsResult = Result<EntityModuleAssets, 'assets'>
