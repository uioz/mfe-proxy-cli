'use strict';
const CWD = process.cwd();
const execa = require('execa');
const {join, parse} = require('path');
const {writeFile} = require('fs').promises;
const resolvePkg = require('resolve-pkg');
const {CONFIG_FILE_NAME, ROUTE_FILE_NAME} = require('./common');

class Downloader {
  constructor(packageName, registry) {
    this.packageName = packageName;
    this.registry = registry;
  }

  async download() {
    const hasRegistryBeforeRequest = 'npm_config_registry' in process.env;
    const registryBeforeRequest = process.env.npm_config_registry;

    if (this.registry) {
      process.env.npm_config_registry = this.registry;
    }

    try {
      await execa('npm', ['install', this.packageName], {
        cwd: CWD,
        stderr: process.stderr,
        stdin: process.stdin,
        stdout: process.stdout,
      });
    } finally {
      if (hasRegistryBeforeRequest) {
        process.env.npm_config_registry = registryBeforeRequest;
      } else {
        delete process.env.npm_config_registry;
      }
    }
  }
}

class ManifestGenerator {
  constructor(path, packageNames) {
    this.path = path;
    this.packageNames = packageNames;
    this.application = [];
  }

  template(applications) {
    return JSON.stringify({
      applications,
    });
  }

  scanPackages() {
    for (const packageName of this.packageNames) {
      // TODO: resolvePkg 即使对不存在的文件也不会报错, 例如 @example/app1/index.js, 除非它完全不存在
      // 由于 require.resolve 完全无法使用, 所以只解析模块的地址, 然后扫描文件系统, 在进行读取数据
      // 目前当作可以正常使用, 后续改为文件系统扫描
      const {dir, base} = parse(resolvePkg(packageName));

      const applicationInfo = {
        name: packageName,
        dir: join(dir, base),
        routePath: undefined,
        outputDir: join(dir, base, 'dist'),
        staticDir: join(dir, base, 'dist/static'),
      };

      try {
        const mfeConfig = require(`${packageName}/${CONFIG_FILE_NAME}`);

        if (mfeConfig.routeConfigPath) {
          applicationInfo.routePath = join(
            applicationInfo.dir,
            mfeConfig.routeConfigPath
          );
        } else {
          applicationInfo.routePath = join(
            applicationInfo.dir,
            ROUTE_FILE_NAME
          );
        }
      } catch (error) {
        // TODO: will fix later
        applicationInfo.routePath = join(applicationInfo.dir, ROUTE_FILE_NAME);
      }

      this.application.push(applicationInfo);
    }
  }

  generate() {
    this.scanPackages();
    return writeFile(this.path, this.template(this.application));
  }
}

/**
 *
 * @param {any} commands
 * @param {any} options
 */
module.exports = async function createCommandHandler(commands, options) {
  console.log('npm install start!');

  const registry = options?.registry;

  for (const command of commands) {
    // TODO: use regexp instead after
    const [packageName, specificRegistry] = command.split('=');
    const downloader = new Downloader(
      packageName,
      specificRegistry ?? registry
    );

    await downloader.download();
  }

  console.log('npm install finish!');

  if (options.manifest) {
    const path = join(CWD, `${options.manifestName}.json`);

    console.log(`manifest will auto generate at ${path}`);

    await new ManifestGenerator(path, commands).generate();
  }
};
