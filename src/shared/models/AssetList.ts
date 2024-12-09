import { Result } from './Result'

export type AssetList = {
  type: string
  assets: string[]
}[]

export type AssetListResult = Result<AssetList, 'assets'>
