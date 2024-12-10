import { basename, dirname, extname, join, resolve } from 'node:path'
import { copyFile, mkdir, mkdtemp, rm, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { AssetInfo, AssetList, Fail, ImportDetails, ImporterSettings, Ok, Result } from '@shared/models'
import { tryReadDir, tryReadJsonFile, tryReadTextFile, tryWriteTextFile } from './file'
import { unique } from './array/unique'
import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli'
import { AdventureModuleAssets, EntityModuleAssets as EntityAssets, PackModuleAssets as PackAssets } from '@main/models'
import { mapAssetList } from '@main/mappers/mapAssetList'

export class FvttModuleAssetImporter {
  private static readonly _instance: FvttModuleAssetImporter = new FvttModuleAssetImporter()

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

  static get Instance() {
    return this._instance
  }

  async initialize(adventureModulePath: string): Promise<Result<never>> {
    if (!adventureModulePath) {
      return Fail('Please provide a module path')
    }

    if (adventureModulePath === this.adventureModulePath) {
      return Ok()
    }

    this.destroyOldTmpDir()

    this.adventureModulePath = adventureModulePath
    this.moduleRoot = resolve(this.adventureModulePath, '..')
    this.dataRoot = resolve(this.moduleRoot, '..')
    this.adventureModuleName = basename(this.adventureModulePath)
    this.moduleAssetPattern = new RegExp(`"(modules/(?!${this.adventureModuleName}).*?)"`, 'g')
    this.packsPath = join(this.adventureModulePath, 'packs')
    this.newModulePath = null
    this.newModuleName = null
    this.newPacksPath = null
    this.tmpPath = await mkdtemp(join(tmpdir(), 'fvtt-asset-importer_'))

    this.packs = []
    this.moduleAssets = null
    this.assetMap = null

    await this.extractModule()

    console.debug(`Initializing importer:
  dataRoot: ${this.dataRoot}
  adventureModuleName: ${this.adventureModuleName}
  tmpPath: ${this.tmpPath}
  packsPath: ${this.packsPath}
`)

    return Ok()
  }

  configure(settings: ImporterSettings): Result<never> {
    const { saveToNewModule, newModuleName } = settings

    if (saveToNewModule) {
      if (!newModuleName) {
        return Fail('Please provide a module name or uncheck the flag to create a new module')
      }

      this.newModulePath = join(this.moduleRoot, newModuleName)
      this.newModuleName = newModuleName
      this.newPacksPath = join(this.newModulePath, 'packs')

      console.debug(`Updating importer settings:
  newModulePath: ${this.newModulePath}
  newModuleName: ${this.newModuleName}
  newPacksPath: ${this.newPacksPath}
`)
    }
  }

  async getExternalAssets(): Promise<Result<AssetList>> {
    if (!this.moduleAssets) {
      const { error } = await this.parseExternalAssets()
      if (error) {
        Fail(error)
      }
    }

    return Ok(mapAssetList(this.moduleAssets))
  }

  async importExternalAssets(): Promise<Result<ImportDetails[]>> {
    if (!this.moduleAssets) {
      const { error } = await this.parseExternalAssets()
      if (error) {
        Fail(error)
      }
    }

    if (this.newModulePath) {
      console.debug(`Copying "${this.adventureModulePath}" into "${this.newModulePath}"`)
      await cp(this.adventureModulePath, this.newModulePath, { recursive: true })
    }

    const copying = this.copyExternalAssetsToAdventureModule()
    const updating = this.updateAssetReferences()

    const result = await Promise.all([copying, updating])

    const errors = result.flatMap((process) => process.map((result) => result.error)).filter((error) => error)
    if (errors.length) {
      return Fail('Expected error(s) during the import.', errors)
    }

    const importDetails = result[0].map((r) => r.value)

    return Ok(importDetails)
  }

  private async extractModule(): Promise<Result<never>> {
    const { error, value: packs } = await tryReadDir(this.packsPath)
    if (error) {
      return Fail(error)
    }

    this.packs = packs

    for (const pack of this.packs) {
      const { originalPackPath, tmpPackPath } = this.getPackPaths(pack)

      console.debug(`Extracting pack "${pack}" from "${originalPackPath}" into "${tmpPackPath}"`)

      await extractPack(originalPackPath, tmpPackPath)
    }

    return Ok()
  }

  private async parseExternalAssets(): Promise<Result<never>> {
    this.moduleAssets = {}
    this.assetMap = {}

    for (const pack of this.packs) {
      const { tmpPackPath } = this.getPackPaths(pack)
      const { error, value: packModuleAssets } = await this.findExternalAssetsForPack(tmpPackPath)
      if (error) {
        return Fail(error)
      }

      console.debug(`Found external assets for "${pack}":`, packModuleAssets)
      this.moduleAssets[pack] = packModuleAssets
    }

    return Ok()
  }

  private async findExternalAssetsForPack(packPath: string): Promise<Result<PackAssets>> {
    const packModuleAssets: PackAssets = {}

    const { error, value: packFiles } = await tryReadDir(packPath)
    if (error) {
      return Fail(error)
    }

    for await (const file of packFiles) {
      if (extname(file) !== '.json') {
        continue
      }

      const filePath = join(packPath, file)
      const { error, value: json } = await tryReadJsonFile(filePath)
      if (error) {
        return Fail(error)
      }

      const entityModuleAssets: EntityAssets = {}

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

    return Ok(packModuleAssets)
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

  private async copyExternalAssetsToAdventureModule(): Promise<Result<ImportDetails>[]> {
    return Promise.all(
      Object.values(this.assetMap).map(async (assetInfo) => {
        try {
          const originalPath = join(this.dataRoot, assetInfo.originalPath)
          const importPath = join(this.dataRoot, assetInfo.internalPath)
          const assetDirectory = dirname(importPath)
          await mkdir(assetDirectory, { recursive: true })
          console.debug(`Copying '${originalPath}' to '${importPath}'`)
          await copyFile(originalPath, importPath)

          return Ok({ from: originalPath, to: importPath })
        } catch (err) {
          return Fail('Unexpected error while copying assets', err)
        }
      }),
    )
  }

  private async updateAssetReferences(): Promise<Result<never>[]> {
    return Promise.all(
      Object.entries(this.moduleAssets).flatMap(([pack, files]) =>
        Object.entries(files).map(async ([file, entities]) => {
          const filePath = join(this.tmpPath, pack, file)
          let { error: readError, value: json } = await tryReadTextFile(filePath)
          if (readError) {
            return Fail(readError)
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
            return Fail(writeError)
          }

          const packPath = join(this.newPacksPath, pack)
          const tmpPackPath = join(this.tmpPath, pack)
          await compilePack(tmpPackPath, packPath)

          return Ok()
        }),
      ),
    )
  }

  private async destroyOldTmpDir() {
    if (this.tmpPath) {
      await rm(this.tmpPath, { recursive: true, force: true })
    }
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
