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
const { Installer, ServerInstaller } = require('./npm-wrapper');

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
    const apps = [];

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

      let relativePath = path.relative(this.context, packagePath);

      if (path.sep === '\\') {
        relativePath = relativePath.split(path.sep).join('/');
      }

      const applicationInfo = {
        name: packageName,
        dir: relativePath,
      };

      apps.push([mfeConfig, applicationInfo]);
    }

    return apps;
  }

  mergeConfig(appsMeta) {
    for (const [mfeConfig, applicationInfo] of appsMeta) {
      this.application.push(
        Object.assign({}, applicationInfo, {
          routePath: path.posix.join(
            applicationInfo.dir,
            mfeConfig.routePath ?? ROUTE_FILE_NAME
          ),
          outputDir: path.posix.join(
            applicationInfo.dir,
            mfeConfig.outputDir ?? DEFAULT_OUTPUT_DIR
          ),
          staticDir: path.posix.join(
            applicationInfo.dir,
            mfeConfig.static?.outputDir ?? DEFAULT_STATIC_DIR
          ),
        })
      );
    }
  }

  generate() {
    this.mergeConfig(this.scanPackages());

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
    const installer = new Installer(
      packageName,
      context,
      registry,
      options.toNpm
    );

    await installer.download();
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

  if (options.serve) {
    const installer = new ServerInstaller('mfe-proxy-server', context);

    await installer.download({
      MFE_SERVER_PORT: options.port,
      MFE_SERVER_HOST: options.host,
      MFE_SERVER_MODE: options.mode,
    });

    execa('npm', ['run serve'], {
      cwd: context,
      detached: true,
      stdio: 'ignore',
    });
  }
};
