import { AssetList } from './AssetList'
import { ImportDetails } from './ImportDetails'
import { ImporterSettings } from './ImporterSettings'
import { Result } from './Result'

export namespace IpcSignatures {
  export namespace File {
    export type selectDirectory = {
      identifier: 'selectDirectory'
      params: void
      returnType: Promise<string | null>
    }
  }

  export namespace FVTT {
    export type initialize = {
      identifier: 'initialize'
      params: { adventureModulePath: string }
      returnType: Promise<Result<never>>
    }
    export type configureImporter = {
      identifier: 'configureImporter'
      params: { settings: ImporterSettings }
      returnType: Result<never>
    }
    export type getExternalAssets = {
      identifier: 'getExternalAssets'
      params: void
      returnType: Promise<Result<AssetList>>
    }
    export type importExternalAssets = {
      identifier: 'importExternalAssets'
      params: void
      returnType: Promise<Result<ImportDetails[]>>
    }
  }
}

export type IpcCall = {
  identifier: string
  params: Record<string, any> | void
  returnType: Promise<any> | any
}

export type PreloadSignature<T extends IpcCall> = (params: T['params']) => T['returnType']
