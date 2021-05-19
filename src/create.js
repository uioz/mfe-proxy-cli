'use strict';

const CWD = process.cwd();
const path = require('path');
const { writeFile, mkdir } = require('fs/promises');
const resolvePkg = require('resolve-pkg');
const {
  CONFIG_FILE_NAME,
  ROUTE_FILE_NAME,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_STATIC_DIR,
} = require('./common');
const { Installer, ServerInstaller } = require('./lib/npm-wrapper');
const {
  readPackageJson,
  writePackageJson,
  initPackage,
  setupServeScript,
} = require('./lib/package');
const server = require('./lib/server');

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
    return JSON.stringify(
      {
        applications,
      },
      undefined,
      '  '
    );
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
      // FIXME: packageName 需要去除 tag 否则 update 的时候无法处理带有 tag 的 packageName
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

  await initPackage(context);

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
    await writePackageJson(context, setupServeScript(readPackageJson(context)));

    await server.install(
      options,
      new ServerInstaller('mfe-proxy-server@latest', context)
    );

    await server.run(context);
  }
};
