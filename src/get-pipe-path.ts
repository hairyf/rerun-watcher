import path from 'node:path'
import process from 'node:process'

import { tmpdir } from './temporary-directory'

export function getPipePath(processId: number): string {
  const pipePath = path.join(tmpdir, `${processId}.pipe`)
  return (
    process.platform === 'win32'
      ? `\\\\?\\pipe\\${pipePath}`
      : pipePath
  )
}
