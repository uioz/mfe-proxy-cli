'use strict';
const CWD = process.cwd();
const execa = require('execa');
const path = require('path');
const {writeFile} = require('fs').promises;
const resolvePkg = require('resolve-pkg');
const {
  CONFIG_FILE_NAME,
  ROUTE_FILE_NAME,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_STATIC_DIR,
} = require('./common');

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
      const packagePath = path.parse(resolvePkg(packageName));

      let dir = path.relative(
        CWD,
        path.join(packagePath.dir, packagePath.base)
      );

      if (path.sep === '\\') {
        dir = dir.replace(path.sep, '/');
      }

      const applicationInfo = {
        name: packageName,
        dir,
        routePath: path.posix.join(dir, ROUTE_FILE_NAME),
        outputDir: path.posix.join(dir, DEFAULT_OUTPUT_DIR),
        staticDir: path.posix.join(dir, DEFAULT_STATIC_DIR),
      };

      const mfeConfigPath = `${packageName}/${CONFIG_FILE_NAME}`;

      try {
        const mfeConfig = require(mfeConfigPath);

        if (mfeConfig.routeConfigPath) {
          applicationInfo.routePath = path.posix.join(
            applicationInfo.dir,
            mfeConfig.routeConfigPath
          );
        }
      } catch (error) {
        console.log(
          `load mfeconfig ${mfeConfigPath} failed, use ${JSON.stringify(
            applicationInfo
          )} instead`
        );
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
    const manifestPath = path.join(CWD, `${options.manifestName}`);

    console.log(`manifest will auto generate at ${manifestPath}`);

    await new ManifestGenerator(manifestPath, commands).generate();
  }
};
