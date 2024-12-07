export type Versions = {
  node: () => string
  chrome: () => string
  electron: () => string
}

export type Messages = {
  ping: () => string
}

declare global {
  const versions: Versions
  const messages: Messages
}
