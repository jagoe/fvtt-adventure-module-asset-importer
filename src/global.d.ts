export type Versions = {
  node: () => string
  chrome: () => string
  electron: () => string
}

export type Messages = {
  ping: () => string
}

export type File = {
  selectDirectory: () => Promise<string | null>
}

declare global {
  const versions: Versions
  const messages: Messages
  const file: File
}
