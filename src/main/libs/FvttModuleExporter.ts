import { basename, extname, join, resolve } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import {
  AdventureModuleAssets,
  AdventureModuleAssetsResult,
  EntityModuleAssets,
  PackModuleAssets,
  PackModuleAssetsResult,
  Result,
} from '@shared/models'
import { tryReadDir, tryReadJsonFile } from './file'
import { unique } from './array/unique'
import { extractPack } from '@foundryvtt/foundryvtt-cli'

enum State {
  Destroyed,
  Created,
  Initialized,
  Extracted,
}

export class FvttModuleAssetExporter {
  static Instance: FvttModuleAssetExporter

  private state: State = State.Created
  private moduleAssetPattern: RegExp

  private dataRoot: string
  private adventureModulePath: string
  private adventureModuleName: string
  private tmpPath: string
  private packsPath: string

  private packs: string[]

  constructor() {}

  static create() {
    if (!this.Instance) {
      this.Instance = new FvttModuleAssetExporter()
    }
  }

  async init(adventureModulePath: string): Promise<Result<void>> {
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
    this.dataRoot = resolve(this.adventureModulePath, '..', '..')
    this.adventureModuleName = basename(this.adventureModulePath)
    this.moduleAssetPattern = new RegExp(`"(modules/(?!${this.adventureModuleName}).*?)"`, 'g')
    this.tmpPath = await mkdtemp(join(tmpdir(), 'fvtt-asset-exporter_'))
    this.packsPath = join(this.adventureModulePath, 'packs')

    this.state = State.Initialized

    console.debug(`Initializing exporter:
  dataRoot: ${this.dataRoot}
  adventureModuleName: ${this.adventureModuleName}
  tmpPath: ${this.tmpPath}
  packsPath: ${this.packsPath}`)

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

    const moduleAssets: AdventureModuleAssets = {}

    for (const pack of this.packs) {
      const { tmpPackPath } = this.getPackPaths(pack)
      const { error, assets: packModuleAssets } = await this.findExternalAssetsForPack(tmpPackPath)
      if (error) {
        return { error }
      }

      console.debug(`Found external assets for "${pack}":`, packModuleAssets)
      moduleAssets[pack] = packModuleAssets
    }

    return { assets: moduleAssets }
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
      const json = await tryReadJsonFile(filePath)
      const entityModuleAssets: EntityModuleAssets = {}

      console.debug(`Filtering for external assets in "${filePath}"`)

      Object.entries(json).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          const arrayJson = JSON.stringify(value)
          const entityAssets = [...arrayJson.matchAll(this.moduleAssetPattern)].map((match) => match[1])

          if (entityAssets.length) {
            entityModuleAssets[key] = unique(entityAssets)
          }
        }
      })

      packModuleAssets[file] = entityModuleAssets
    }

    return { assets: packModuleAssets }
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
}
