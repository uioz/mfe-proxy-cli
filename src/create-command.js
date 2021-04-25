'use strict';
const CWD = process.cwd();
const execa = require('execa');
const path = require('path');
const { writeFile, mkdir } = require('fs').promises;
const resolvePkg = require('resolve-pkg');
const {
  CONFIG_FILE_NAME,
  ROUTE_FILE_NAME,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_STATIC_DIR,
} = require('./common');

class Downloader {
  /**
   *
   * @param {string} packageName
   * @param {string} registry
   * @param {string} context
   * @param {Array<string>} args
   */
  constructor(packageName, registry, context, args = []) {
    this.packageName = packageName;
    this.context = context;

    const registryFlag = '--registry';

    if (registry) {
      // ['options1','--registry','from --to-npm options']
      // -> ['options1','--registry','into specific registry in [packageName](registry)']
      const index = args.indexOf(registryFlag);

      if (index !== -1) {
        args.splice(index, 0, registry);
      } else {
        args.push(registryFlag, registry);
      }
    }

    this.args = args;
  }

  async download() {
    await execa('npm', ['install', this.packageName, ...this.args], {
      cwd: this.context,
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    });
  }
}

function getMfeConfig(packagePath, packageName) {
  packagePath = path.join(packagePath, CONFIG_FILE_NAME);
  try {
    const mfeConfig = require(packagePath);

    if (typeof mfeConfig === 'object') {
      return mfeConfig;
    }
    console.error(
      `Wrong format with the ${packageName}'s ${CONFIG_FILE_NAME}.`
    );
    return false;
  } catch (error) {
    console.warn(
      `Skipping the package of ${packageName} cuz it doesn't have a ${CONFIG_FILE_NAME} included.`
    );
    return false;
  }
}

class ManifestGenerator {
  constructor(path, packageNames, context) {
    this.context = context;
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
      const parsedPackageMeta = path.parse(
        resolvePkg(packageName, {
          cwd: this.context,
        })
      );

      const packagePath = path.join(
        parsedPackageMeta.dir,
        parsedPackageMeta.base
      );

      const mfeConfig = getMfeConfig(packagePath, packageName);

      if (!mfeConfig) {
        continue;
      }

      let dir = path.relative(this.context, packagePath);

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

      if (mfeConfig.routeConfigPath) {
        applicationInfo.routePath = path.posix.join(
          applicationInfo.dir,
          mfeConfig.routeConfigPath
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
 * @param {Array<string>} packageNames
 * @returns
 */
function parsePackageName(packageNames) {
  const pattern = /^\[(.+)\]<(.+)>/;

  return packageNames.map((packageName) => {
    const result = packageName.match(pattern);

    if (result) {
      return {
        packageName: result[1],
        registry: result[2],
      };
    }
    return {
      packageName: packageName,
      registry: null,
    };
  });
}

async function makeDirAsPackage(context) {
  await execa('npm', ['init', '-y'], {
    cwd: context,
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  });
}

/**
 * @param {string} folderName
 * @param {Array<string>} commands
 * @param {any} options
 */
module.exports = async function createCommandHandler(
  folderName,
  commands,
  options
) {
  const context = path.join(CWD, folderName);

  await mkdir(context);

  await makeDirAsPackage(context);

  const packageMeta = parsePackageName(commands);

  for (const { packageName, registry } of packageMeta) {
    const downloader = new Downloader(
      packageName,
      registry,
      context,
      options.toNpm
    );

    await downloader.download();
  }

  if (options.manifest) {
    const manifestPath = path.join(context, `${options.manifestName}`);

    console.log(`manifest will auto generate at ${manifestPath}`);

    await new ManifestGenerator(
      manifestPath,
      packageMeta.map((item) => item.packageName),
      context
    ).generate();
  }
};
