declare module '@foundryvtt/foundryvtt-cli' {
  export function extractPack(sourceDirectory: string, targetDirectory: string): Promise<void>
  export function compilePack(sourceDirectory: string, targetDirectory: string): Promise<void>
}
