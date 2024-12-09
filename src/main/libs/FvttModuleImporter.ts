import { basename, dirname, extname, join, resolve } from 'node:path'
import { copyFile, mkdir, mkdtemp, rm, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import {
  AdventureModuleAssets,
  AdventureModuleAssetsResult,
  AssetInfo,
  EntityModuleAssets,
  PackModuleAssets,
  PackModuleAssetsResult,
  Result,
} from '@shared/models'
import { tryReadDir, tryReadJsonFile, tryReadTextFile, tryWriteTextFile } from './file'
import { unique } from './array/unique'
import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli'

enum State {
  Destroyed,
  Created,
  Initialized,
  Extracted,
}

export class FvttModuleAssetImporter {
  static Instance: FvttModuleAssetImporter

  private state: State = State.Created
  private moduleAssetPattern: RegExp

  private dataRoot: string
  private moduleRoot: string
  private adventureModulePath: string
  private adventureModuleName: string
  private newModulePath: string
  private newModuleName: string
  private tmpPath: string
  private packsPath: string
  private newPacksPath: string

  private packs: string[]
  private moduleAssets: AdventureModuleAssets
  private assetMap: Record<string, AssetInfo>

  constructor() {}

  static create() {
    if (!this.Instance) {
      this.Instance = new FvttModuleAssetImporter()
    }

    return this.Instance
  }

  async init(adventureModulePath: string, newModuleName: string): Promise<Result<void>> {
    if (!adventureModulePath) {
      return { error: { message: 'Please provide a module path' } }
    }

    if (adventureModulePath === this.adventureModulePath) {
      return {}
    }

    if (this.state > State.Created) {
      this.destroy()
    }

    this.adventureModulePath = adventureModulePath
    this.moduleRoot = resolve(this.adventureModulePath, '..')
    this.dataRoot = resolve(this.moduleRoot, '..')
    this.adventureModuleName = basename(this.adventureModulePath)
    this.moduleAssetPattern = new RegExp(`"(modules/(?!${this.adventureModuleName}).*?)"`, 'g')
    this.packsPath = join(this.adventureModulePath, 'packs')
    this.newModulePath = newModuleName ? join(this.moduleRoot, newModuleName) : null
    this.newModuleName = newModuleName ? newModuleName : null
    this.newPacksPath = newModuleName ? join(this.newModulePath, 'packs') : null
    this.tmpPath = await mkdtemp(join(tmpdir(), 'fvtt-asset-importer_'))

    this.packs = []
    this.state = State.Initialized

    console.debug(`Initializing importer:
  dataRoot: ${this.dataRoot}
  adventureModuleName: ${this.adventureModuleName}
  tmpPath: ${this.tmpPath}
  packsPath: ${this.packsPath}
  newModulePath: ${this.newModulePath}
  newModuleName: ${this.newModuleName}
  newPacksPath: ${this.newPacksPath}
`)

    return {}
  }

  async extractModule(): Promise<Result<never>> {
    if (this.state < State.Initialized) {
      return { error: { message: 'Please run the initialize method before trying to extract the module.' } }
    }

    if (this.state >= State.Extracted) {
      return {}
    }

    const { error, value: packs } = await tryReadDir(this.packsPath)
    if (error) {
      return { error }
    }

    this.packs = packs

    for (const pack of this.packs) {
      const { originalPackPath, tmpPackPath } = this.getPackPaths(pack)

      console.debug(`Extracting pack "${pack}" from "${originalPackPath}" into "${tmpPackPath}"`)

      await extractPack(originalPackPath, tmpPackPath)
    }

    this.state = State.Extracted

    return {}
  }

  async findExternalAssets(): Promise<AdventureModuleAssetsResult> {
    if (this.state < State.Extracted) {
      return { error: { message: 'Please extract the module before trying to list its external assets.' } }
    }

    this.moduleAssets = {}
    this.assetMap = {}

    for (const pack of this.packs) {
      const { tmpPackPath } = this.getPackPaths(pack)
      const { error, assets: packModuleAssets } = await this.findExternalAssetsForPack(tmpPackPath)
      if (error) {
        return { error }
      }

      console.debug(`Found external assets for "${pack}":`, packModuleAssets)
      this.moduleAssets[pack] = packModuleAssets
    }

    return { assets: this.moduleAssets }
  }

  async importExternalAssets(): Promise<Result<void>> {
    if (this.newModulePath) {
      await cp(this.adventureModulePath, this.newModulePath, { recursive: true })
    }

    const copying = this.copyExternalAssetsToAdventureModule()
    const updating = this.updateAssetReferences()

    const result = await Promise.all([copying, updating])

    const errors = result.flatMap((process) => process.map((result) => result.error)).filter((error) => error)
    if (errors.length) {
      return { error: { message: 'Expected error(s) during the import.', details: errors } }
    }

    return {}
  }

  private async findExternalAssetsForPack(packPath: string): Promise<PackModuleAssetsResult> {
    const packModuleAssets: PackModuleAssets = {}

    const { error, value: packFiles } = await tryReadDir(packPath)
    if (error) {
      return { error }
    }

    for await (const file of packFiles) {
      if (extname(file) !== '.json') {
        continue
      }

      const filePath = join(packPath, file)
      const { error, value: json } = await tryReadJsonFile(filePath)
      if (error) {
        return { error }
      }

      const entityModuleAssets: EntityModuleAssets = {}

      console.debug(`Filtering for external assets in "${filePath}"`)

      Object.entries(json).forEach(([entityType, value]) => {
        if (Array.isArray(value)) {
          const arrayJson = JSON.stringify(value)
          const entityAssets = [...arrayJson.matchAll(this.moduleAssetPattern)].map((match) => match[1])

          this.buildAssetMap(entityType, entityAssets)

          if (entityAssets.length) {
            entityModuleAssets[entityType] = unique(entityAssets).map((asset) => ({
              entityType,
              originalPath: asset,
              internalPath: this.assetMap[asset].internalPath,
            }))
          }
        }
      })

      packModuleAssets[file] = entityModuleAssets
    }

    return { assets: packModuleAssets }
  }

  private buildAssetMap(entityType: string, assets: string[]) {
    assets.forEach((asset) => {
      if (this.assetMap[asset]) {
        return
      }

      this.assetMap[asset] = {
        entityType,
        originalPath: asset,
        internalPath: this.getInternalAssetPath(entityType, asset),
      }
    })
  }

  private async copyExternalAssetsToAdventureModule(): Promise<Result<void>[]> {
    return Promise.all(
      Object.values(this.assetMap).map(async (assetInfo) => {
        try {
          const originalPath = join(this.dataRoot, assetInfo.originalPath)
          const importPath = join(this.dataRoot, assetInfo.internalPath)
          const assetDirectory = dirname(importPath)
          await mkdir(assetDirectory, { recursive: true })
          console.debug(`Copying '${originalPath}' to '${importPath}'`)
          await copyFile(originalPath, importPath)

          return {}
        } catch (err) {
          return { error: { message: 'Unexpected error while copying assets', detail: err } }
        }
      }),
    )
  }

  private async updateAssetReferences(): Promise<Result<void>[]> {
    return Promise.all(
      Object.entries(this.moduleAssets).flatMap(([pack, files]) =>
        Object.entries(files).map(async ([file, entities]) => {
          const filePath = join(this.tmpPath, pack, file)
          let { error: readError, value: json } = await tryReadTextFile(filePath)
          if (readError) {
            return { error: readError }
          }

          console.debug(`Replacing assets in pack ${pack}`)

          Object.values(entities)
            .flatMap((assets) => assets)
            .forEach((asset) => {
              console.debug(`  Replacing '${asset.originalPath}' with '${asset.internalPath}'`)
              json = json.replaceAll(asset.originalPath, asset.internalPath)
            })

          const { error: writeError } = await tryWriteTextFile(filePath, json)
          if (writeError) {
            return { error: writeError }
          }

          const packPath = join(this.newPacksPath, pack)
          const tmpPackPath = join(this.tmpPath, pack)
          await compilePack(tmpPackPath, packPath)

          return {}
        }),
      ),
    )
  }

  async destroy() {
    if (this.state < State.Initialized) {
      return
    }

    await rm(this.tmpPath, { recursive: true, force: true })

    this.state = State.Destroyed
  }

  private getPackPaths(pack: string) {
    return {
      originalPackPath: join(this.packsPath, pack),
      tmpPackPath: join(this.tmpPath, pack),
    }
  }

  private getInternalAssetPath(entityType: string, originalPath: string) {
    return join(
      'modules',
      this.newModuleName || this.adventureModuleName,
      'assets',
      entityType,
      this.getInternalAssetName(originalPath),
    )
  }

  private static readonly moduleMatchPattern = /^modules\/(.*?)\/.*?$/
  private getInternalAssetName(assetPath: string) {
    const moduleNameMatch = assetPath.match(FvttModuleAssetImporter.moduleMatchPattern)
    const moduleName = moduleNameMatch ? moduleNameMatch[1] : ''
    return `${moduleName}_${basename(assetPath)}`
  }
}
