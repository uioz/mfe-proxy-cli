'use strict';

const CWD = process.cwd();
const path = require('path');
const { writeFile, mkdir } = require('fs/promises');
const resolvePkg = require('resolve-pkg');
const ParsePackageName = require('parse-package-name');
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
  constructor(path, packageMetas, context) {
    this.context = context;
    this.path = path;
    this.packageMetas = packageMetas;
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

    for (const { packageName, registry } of this.packageMetas) {
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
        registry,
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
        // ParsePackageName.name doesn't include version
        packageName: ParsePackageName(result[1]).name,
        registry: result[2],
      };
    }
    return {
      packageName: ParsePackageName(packageName).name,
      registry: null,
    };
  });
}

/**
 *
 * @param {Array<string>} options
 */
function extractRegistryFromNpmOptions(options) {
  const registryOption = '--registry';
  const registryOptionE = /^--registry=(.+)/i;

  let isEqualRegistryOption;
  const index = options.findIndex((option) => {
    if (option === registryOption) {
      isEqualRegistryOption = true;
      return true;
    } else if (registryOptionE.test(option)) {
      isEqualRegistryOption = false;
      return true;
    }
  });

  let registry;

  if (isEqualRegistryOption === true) {
    registry = options[index + 1];
    // new URL will throw a error if registry isn't a valid URL
    new URL(registry);
    // remove
    options.splice(index, 2);
  } else if (isEqualRegistryOption === false) {
    const result = options[index].match(registryOptionE);
    registry = result[1];

    // new URL will throw a error if registry isn't a valid URL
    new URL(registry);
    // remove
    options.splice(index, 1);
  }

  return registry;
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

  let parsedPackageMetas = parsePackageName(commands);

  // handle registry from command
  if (options.toNpm?.length) {
    const registry = extractRegistryFromNpmOptions(options.toNpm);

    if (registry) {
      parsedPackageMetas = parsedPackageMetas.map((item) => {
        if (item.registry === null) {
          item.registry = registry;
        }
        return item;
      });
    }
  }

  for (const { packageName, registry } of parsedPackageMetas) {
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
      parsedPackageMetas,
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
