import rawSnapshot from './bootstrap.json?raw'
import type { ExpoPilotSnapshot } from './types'

export const embeddedSnapshot = JSON.parse(rawSnapshot.replace(/^\uFEFF/, '')) as ExpoPilotSnapshot
