import type { FSWatcher, WatchOptions } from 'chokidar'
/* eslint-disable ts/no-use-before-define */
import type { ChildProcess } from 'node:child_process'
import { constants as osConstants } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { watch } from 'chokidar'
import { lightGreen, lightMagenta, yellow } from 'kolorist'
import normalize from 'normalize-path'
import { createIpcServer } from './server'
import {
  clearScreen,
  debounce,
  log,
} from './utils'

export type { FSWatcher }

export interface RerunWatcherOptions extends Omit<WatchOptions, 'ignored'> {
  name?: string
  ignored?: (string | RegExp | ((testString: string) => boolean))[]
}

export async function createRerunWatcher(
  paths: string[],
  run: () => ChildProcess | Promise<ChildProcess>,
  options: RerunWatcherOptions = {},
): Promise<FSWatcher> {
  let runProcess: ChildProcess | undefined
  let exiting = false
  const { name, ...chokidarOptions } = options

  const server = await createIpcServer()

  server.on('data', (data) => {
    // Collect run-time dependencies to watch
    if (
      data
      && typeof data === 'object'
      && 'type' in data
      && data.type === 'dependency'
      && 'path' in data
      && typeof data.path === 'string'
    ) {
      const dependencyPath = (
        data.path.startsWith('file:')
          ? fileURLToPath(data.path)
          : data.path
      )

      if (path.isAbsolute(dependencyPath)) {
        watcher.add(dependencyPath)
      }
    }
  })

  const spawnProcess = (): undefined | ChildProcess | Promise<ChildProcess> => {
    if (exiting) {
      return
    }

    return run()
  }

  let waitingChildExit = false

  const killProcess = async (
    childProcess: ChildProcess,
    signal: NodeJS.Signals = 'SIGTERM',
    forceKillOnTimeout = 5000,
  ): Promise<number | null> => {
    let exited = false
    const waitForExit = new Promise<number | null>((resolve) => {
      childProcess.on('exit', (exitCode) => {
        exited = true
        waitingChildExit = false
        resolve(exitCode)
      })
    })

    waitingChildExit = true
    childProcess.kill(signal)

    setTimeout(() => {
      if (!exited) {
        log(name, yellow(`Process didn't exit in ${Math.floor(forceKillOnTimeout / 1000)}s. Force killing...`))
        childProcess.kill('SIGKILL')
      }
    }, forceKillOnTimeout)

    return await waitForExit
  }

  const reRun = debounce(async (event?: string, filePath?: string) => {
    const reasons = [
      event && lightMagenta(event),
      filePath && `in ${lightGreen(`./${normalize(filePath)}`)}`,
    ]
    const reason = reasons.filter(Boolean).join(' ')

    if (waitingChildExit) {
      log(name, reason, yellow('Process hasn\'t exited. Killing process...'))
      runProcess!.kill('SIGKILL')
      return
    }

    // If not first run
    if (runProcess) {
      // If process still running
      if (runProcess.exitCode === null)
        await killProcess(runProcess)

      process.stdout.write(clearScreen)
      log(name, reason, yellow('Rerunning...'))
    }

    runProcess = await spawnProcess()
  }, 100)

  reRun()
  const relaySignal = (signal: NodeJS.Signals): void => {
    // Disable further spawns
    exiting = true

    // Child is still running, kill it
    if (runProcess?.exitCode === null) {
      if (waitingChildExit) {
        log(name, yellow('Previous process hasn\'t exited yet. Force killing...'))
      }

      killProcess(
        runProcess,
        // Second Ctrl+C force kills
        waitingChildExit ? 'SIGKILL' : signal,
      ).then(
        (exitCode) => {
          process.exit(exitCode ?? 0)
        },
        () => {},
      )
    }
    else {
      process.exit(osConstants.signals[signal])
    }
  }

  process.on('SIGINT', relaySignal)
  process.on('SIGTERM', relaySignal)

  /**
   * Ideally, we can get a list of files loaded from the run above
   * and only watch those files, but it's not possible to detect
   * the full dependency-tree at run-time because they can be hidden
   * in a if-condition/async-delay.
   *
   * As an alternative, we watch cwd and all run-time dependencies
   */
  const watcher = watch(paths, {
    cwd: process.cwd(),
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ...chokidarOptions,
    ignored: [
      // Hidden directories like .git
      '**/.*/**',

      // Hidden files (e.g. logs or temp files)
      '**/.*',

      // 3rd party packages
      '**/{node_modules,bower_components,vendor}/**',

      ...(options.ignored ?? []),
    ],
  })

  watcher.on('all', reRun)

  // On "Return" key
  process.stdin.on('data', () => reRun('Return key'))
  return watcher
}
