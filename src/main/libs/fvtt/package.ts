import { ClassicLevel } from 'classic-level'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'

/* -------------------------------------------- */
/*  Configuration                               */
/* -------------------------------------------- */

/**
 * @typedef {
 *   "Actor"|"Adventure"|"Cards"|"ChatMessage"|"Combat"|"FogExploration"|"Folder"|"Item"|"JournalEntry"|"Macro"|
 *   "Playlist"|"RollTable"|"Scene"|"Setting"|"User"
 * } DocumentType
 */

/**
 * @typedef {
 *   "actors"|"adventures"|"cards"|"messages"|"combats"|"fog"|"folders"|"items"|"journal"|"macros"|"playlists"|"tables"|
 *   "scenes"|"settings"|"users"
 * } DocumentCollection
 */

/**
 * @typedef {object} PackageOptions
 * @property {boolean} [nedb=false]               Whether to operate on a NeDB database, otherwise a LevelDB database is
 *                                                assumed.
 * @property {boolean} [log=false]                Whether to log operation progress to the console.
 * @property {EntryTransformer} [transformEntry]  A function that is called on every entry to transform it.
 */

/**
 * @typedef {PackageOptions} CompileOptions
 * @property {boolean} [recursive=false]  Whether to recurse into child directories to locate source files, otherwise
 *                                        only source files located in the root directory will be used.
 */

/**
 * @typedef {PackageOptions} ExtractOptions
 * @property {JSONOptions} [jsonOptions]        Options to pass to JSON.stringify when serializing Documents.
 * @property {DocumentType} [documentType]      Required only for NeDB packs in order to generate a correct key.
 * @property {boolean} [clean]                  Delete the destination directory before unpacking.
 * @property {DocumentCollection} [collection]  Required only for NeDB packs in order to generate a correct key. Can be
 *                                              used instead of documentType if known.
 * @property {NameTransformer} [transformName]  A function that is used to generate a filename for the extracted
 *                                              Document. If used, the generated name must include the appropriate file
 *                                              extension. The generated name will be resolved against the root path
 *                                              provided to the operation, and the entry will be written to that
 *                                              resolved location.
 */

/**
 * @typedef {object} JSONOptions
 * @property {JSONReplacer|Array<string|number>} [replacer]  A replacer function or an array of property names in the
 *                                                           object to include in the resulting string.
 * @property {string|number} [space]                         A number of spaces or a string to use as indentation.
 */

/**
 * @callback JSONReplacer
 * @param {string} key  The key being stringified.
 * @param {any} value   The value being stringified.
 * @returns {any}       The value returned is substituted instead of the current property's value.
 */

/**
 * @callback EntryTransformer
 * @param {object} entry           The entry data.
 * @returns {Promise<false|void>}  Return boolean false to indicate that this entry should be discarded.
 */

/**
 * @callback NameTransformer
 * @param {object} entry            The entry data.
 * @returns {Promise<string|void>}  If a string is returned, it is used as the filename that the entry will be written
 *                                  to.
 */

/**
 * @callback HierarchyApplyCallback
 * @param {object} doc              The Document being operated on.
 * @param {string} collection       The Document's collection.
 * @param {object} [options]        Additional options supplied by the invocation on the level above this one.
 * @returns {Promise<object|void>}  Options to supply to the next level of the hierarchy.
 */

/**
 * @callback HierarchyMapCallback
 * @param {any} entry          The element stored in the collection.
 * @param {string} collection  The collection name.
 * @returns {Promise<any>}
 */

/**
 * A flattened view of the Document hierarchy. The type of the value determines what type of collection it is. Arrays
 * represent embedded collections, while objects represent embedded documents.
 * @type {Record<string, Record<string, object|Array>>}
 */
const HIERARCHY = {
  actors: {
    items: [] as unknown[],
    effects: [] as unknown[],
  },
  cards: {
    cards: [] as unknown[],
  },
  combats: {
    combatants: [] as unknown[],
  },
  delta: {
    items: [] as unknown[],
    effects: [] as unknown[],
  },
  items: {
    effects: [] as unknown[],
  },
  journal: {
    pages: [] as unknown[],
  },
  playlists: {
    sounds: [] as unknown[],
  },
  regions: {
    behaviors: [] as unknown[],
  },
  tables: {
    results: [] as unknown[],
  },
  tokens: {
    delta: {},
  },
  scenes: {
    drawings: [] as unknown[],
    tokens: [] as unknown[],
    lights: [] as unknown[],
    notes: [] as unknown[],
    regions: [] as unknown[],
    sounds: [] as unknown[],
    templates: [] as unknown[],
    tiles: [] as unknown[],
    walls: [] as unknown[],
  },
}

/**
 * A mapping of primary document types to collection names.
 * @type {Record<DocumentType, DocumentCollection>}
 */
export const TYPE_COLLECTION_MAP = {
  Actor: 'actors',
  Adventure: 'adventures',
  Cards: 'cards',
  ChatMessage: 'messages',
  Combat: 'combats',
  FogExploration: 'fog',
  Folder: 'folders',
  Item: 'items',
  JournalEntry: 'journal',
  Macro: 'macros',
  Playlist: 'playlists',
  RollTable: 'tables',
  Scene: 'scenes',
  Setting: 'settings',
  User: 'users',
}

/* -------------------------------------------- */
/*  Compiling                                   */
/* -------------------------------------------- */

/**
 * Compile source files into a compendium pack.
 * @param {string} src   The directory containing the source files.
 * @param {string} dest  The target compendium pack. This should be a directory for LevelDB packs, or a .db file for
 *                       NeDB packs.
 * @param {CompileOptions} [options]
 * @returns {Promise<void>}
 */
export async function compilePack(src: string, dest: string, { recursive = false, log = false } = {}) {
  const files = findSourceFiles(src, { recursive })
  return compileClassicLevel(dest, files, { log })
}

/**
 * Compile a set of files into a LevelDB compendium pack.
 * @param {string} pack  The target compendium pack.
 * @param {string[]} files  The source files.
 * @param {Partial<PackageOptions>} [options]
 * @returns {Promise<void>}
 */
async function compileClassicLevel(pack: string, files: string[], { log } = { log: false }) {
  // Create the classic level directory if it doesn't already exist.
  mkdirSync(pack, { recursive: true })

  // Load the directory as a ClassicLevel DB.
  const db = new ClassicLevel(pack, { keyEncoding: 'utf8', valueEncoding: 'json' })
  const batch = db.batch()
  const seenKeys = new Set()

  const packDoc = applyHierarchy(async (doc: any, collection: any) => {
    const key = doc._key
    delete doc._key
    if (seenKeys.has(key)) {
      throw new Error(`An entry with key '${key}' was already packed and would be overwritten by this entry.`)
    }
    seenKeys.add(key)
    const value = structuredClone(doc)
    await mapHierarchy(value, collection, (d: any) => d._id)
    batch.put(key, value)
  })

  // Iterate over all files in the input directory, writing them to the DB.
  for (const file of files) {
    try {
      const contents = readFileSync(file, 'utf8')
      const doc = JSON.parse(contents)
      const [, collection] = doc._key.split('!')
      await packDoc(doc, collection)
      if (log) console.log(`Packed ${doc._id}}${doc.name ? ` (${doc.name})` : ''}`)
    } catch (err) {
      if (log) console.error(`Failed to pack ${file}. See error below.`)
      throw err
    }
  }

  // Remove any entries in the DB that are not part of the source set.
  for (const key of await db.keys().all()) {
    if (!seenKeys.has(key)) {
      batch.del(key)
      if (log) console.log(`Removed ${key}`)
    }
  }

  await batch.write()
  await compactClassicLevel(db)
  await db.close()
}

/* -------------------------------------------- */

/**
 * Flushes the log of the given database to create compressed binary tables.
 * @param {ClassicLevel} db The database to compress.
 * @returns {Promise<void>}
 */
async function compactClassicLevel(db: any) {
  const forwardIterator = db.keys({ limit: 1, fillCache: false })
  const firstKey = await forwardIterator.next()
  await forwardIterator.close()

  const backwardIterator = db.keys({ limit: 1, reverse: true, fillCache: false })
  const lastKey = await backwardIterator.next()
  await backwardIterator.close()

  if (firstKey && lastKey) return db.compactRange(firstKey, lastKey, { keyEncoding: 'utf8' })
}

/* -------------------------------------------- */
/*  Extracting                                  */
/* -------------------------------------------- */

/**
 * Extract the contents of a compendium pack into individual source files for each primary Document.
 * @param {string} src   The source compendium pack. This should be a directory for LevelDB pack, or a .db file for
 *                       NeDB packs.
 * @param {string} dest  The directory to write the extracted files into.
 * @param {ExtractOptions} [options]
 * @returns {Promise<void>}
 */
export async function extractPack(src: string, dest: string, { jsonOptions = {}, log = false, clean = false } = {}) {
  if (clean) rmSync(dest, { force: true, recursive: true, maxRetries: 10 })
  // Create the output directory if it doesn't exist already.
  mkdirSync(dest, { recursive: true })
  return extractClassicLevel(src, dest, { log, jsonOptions })
}

/**
 * Extract a LevelDB pack into individual source files for each primary Document.
 * @param {string} pack  The source compendium pack.
 * @param {string} dest  The root output directory.
 * @param {Partial<ExtractOptions>} [options]
 * @returns {Promise<void>}
 */
async function extractClassicLevel(
  pack: string,
  dest: string,
  { jsonOptions, log }: { jsonOptions: any; log: boolean },
) {
  // Load the directory as a ClassicLevel DB.
  const db = new ClassicLevel<string, any>(pack, { keyEncoding: 'utf8', valueEncoding: 'json' })

  const unpackDoc = applyHierarchy(
    async (
      doc: any,
      collection: any,
      { sublevelPrefix, idPrefix }: { sublevelPrefix?: string; idPrefix?: string } = {},
    ) => {
      const sublevel = keyJoin(sublevelPrefix, collection)
      const id = keyJoin(idPrefix, doc._id)
      doc._key = `!${sublevel}!${id}`
      await mapHierarchy(doc, collection, (embeddedId: string, embeddedCollectionName: string) => {
        return db.get(`!${sublevel}.${embeddedCollectionName}!${id}.${embeddedId}`)
      })
      return { sublevelPrefix: sublevel, idPrefix: id }
    },
  )

  // Iterate over all entries in the DB, writing them as source files.
  for await (const [key, doc] of db.iterator()) {
    const [, collection, id] = key.split('!')
    if (collection.includes('.')) continue // This is not a primary document, skip it.
    await unpackDoc(doc, collection as keyof typeof HIERARCHY)
    const name = `${doc.name ? `${getSafeFilename(doc.name)}_${id}` : key}.json`
    const filename = join(dest, name)
    serializeDocument(doc, filename, { jsonOptions })
    if (log) console.log(`Wrote ${name}`)
  }

  await db.close()
}

/* -------------------------------------------- */
/*  Utilities                                   */
/* -------------------------------------------- */

/**
 * Wrap a function so that it can be applied recursively to a Document's hierarchy.
 * @param {HierarchyApplyCallback} fn  The function to wrap.
 * @returns {HierarchyApplyCallback}   The wrapped function.
 */
function applyHierarchy(fn: any) {
  const apply = async (doc: any, collection: keyof typeof HIERARCHY, options = {}) => {
    const newOptions = await fn(doc, collection, options)
    for (const [embeddedCollectionName, type] of Object.entries(HIERARCHY[collection] ?? {})) {
      const embeddedValue = doc[embeddedCollectionName]
      if (Array.isArray(type) && Array.isArray(embeddedValue)) {
        for (const embeddedDoc of embeddedValue)
          await apply(embeddedDoc, embeddedCollectionName as keyof typeof HIERARCHY, newOptions)
      } else if (embeddedValue) await apply(embeddedValue, embeddedCollectionName as keyof typeof HIERARCHY, newOptions)
    }
  }
  return apply
}

/* -------------------------------------------- */

/**
 * Transform a Document's embedded collections by applying a function to them.
 * @param {object} doc               The Document being operated on.
 * @param {string} collection        The Document's collection.
 * @param {HierarchyMapCallback} fn  The function to invoke.
 */
async function mapHierarchy(doc: any, collection: keyof typeof HIERARCHY, fn: any) {
  for (const [embeddedCollectionName, type] of Object.entries(HIERARCHY[collection] ?? {})) {
    const embeddedValue = doc[embeddedCollectionName]
    if (Array.isArray(type)) {
      if (Array.isArray(embeddedValue)) {
        doc[embeddedCollectionName] = await Promise.all(
          embeddedValue.map((entry) => {
            return fn(entry, embeddedCollectionName)
          }),
        )
      } else doc[embeddedCollectionName] = []
    } else {
      if (embeddedValue) doc[embeddedCollectionName] = await fn(embeddedValue, embeddedCollectionName)
      else doc[embeddedCollectionName] = null
    }
  }
}

/* -------------------------------------------- */

/**
 * Locate all source files in the given directory.
 * @param {string} root  The root directory to search in.
 * @param {Partial<CompileOptions>} [options]
 * @returns {string[]}
 */
function findSourceFiles(root: string, { recursive = false } = {}): any {
  const files = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const name = join(root, entry.name)
    if (entry.isDirectory() && recursive) {
      files.push(...findSourceFiles(name, { recursive }))
      continue
    }
    if (!entry.isFile()) continue
    const ext = extname(name)
    if (ext === '.json') files.push(name)
  }
  return files
}

/* -------------------------------------------- */

/**
 * Serialize a Document and write it to the filesystem.
 * @param {object} doc                         The Document to serialize.
 * @param {string} filename                    The filename to write it to.
 * @param {Partial<ExtractOptions>} [options]  Options to configure serialization behavior.
 */
function serializeDocument(doc: any, filename: string, { jsonOptions }: { jsonOptions?: any } = {}) {
  mkdirSync(dirname(filename), { recursive: true })
  const { replacer = null, space = 2 } = jsonOptions
  const serialized = JSON.stringify(doc, replacer, space)
  writeFileSync(filename, serialized + '\n')
}

/* -------------------------------------------- */

/**
 * Join non-blank key parts.
 * @param {...string} args  Key parts.
 * @returns {string}
 */
function keyJoin(...args: string[]) {
  return args.filter((_) => _).join('.')
}

/* -------------------------------------------- */

/**
 * Ensure a string is safe for use as a filename.
 * @param {string} filename         The filename to sanitize
 * @returns {string}                The sanitized filename
 */
function getSafeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9А-я]/g, '_')
}
