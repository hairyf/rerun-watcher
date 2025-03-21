# rerun-watcher

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Create a rerun watcher using chokidar

## Install

```bash
npm i rerun-watcher
```

## Usage

```ts
import spawn from 'cross-spawn'
import { createRerunWatcher } from 'rerun-watcher'

const watcher = await createRerunWatcher(
  ['src/**/*.js', 'src/**/*.jsx'],
  () => {
    return spawn('node', ['src/main.js'], {
      stdio: [
        'inherit', // stdin
        'inherit', // stdout
        'inherit', // stderr
      ]
    })
  }
)
```

Change any file in `src` directory, the `src/main.js` will be rerun.

```
13:40:01 change in ./src/config.js Rerunning...
```

You can configure your application name and ignore files:

```ts
const watcher = await createRerunWatcher(
  ['src/**/*.js', 'src/**/*.jsx'],
  () => {
    // ...
  },
  {
    name: 'MyApp',
    ignored: [
      'src/**/*.test.js'
    ],
    // ...any other chokidar options
  }
)
```

```sh
13:40:01 [MyApp] change in ./src/config.js Rerunning...
```

## License

[MIT](./LICENSE) License © [Hairyf](https://github.com/hairyf)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/rerun-watcher?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/rerun-watcher
[npm-downloads-src]: https://img.shields.io/npm/dm/rerun-watcher?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/rerun-watcher
[bundle-src]: https://img.shields.io/bundlephobia/minzip/rerun-watcher?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=rerun-watcher
[license-src]: https://img.shields.io/github/license/hairyf/rerun-watcher.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/hairyf/rerun-watcher/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/rerun-watcher
