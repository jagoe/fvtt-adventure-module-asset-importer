import { Result } from '../../shared/models/Result'

export type EntityModuleAssets = {
  [entity: string]: string[]
}

export type EntityModuleAssetsResult = Result<EntityModuleAssets, 'assets'>
