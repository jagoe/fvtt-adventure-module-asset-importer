import { AssetInfo } from './AssetInfo'
import { Result } from './Result'

export type AssetList = {
  entity: string
  assets: AssetInfo[]
}[]

export type AssetListResult = Result<AssetList, 'assets'>
