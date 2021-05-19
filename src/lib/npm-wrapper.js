'use strict';

const execa = require('execa');

class Installer {
  /**
   *
   * @param {string} packageName
   * @param {string} context
   * @param {string} [registry]
   * @param {Array<string>} args
   */
  constructor(packageName, context, registry, args = []) {
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
      stdio: 'inherit',
    });
  }
}

exports.Installer = Installer;

class ServerInstaller extends Installer {
  download(env) {
    return execa('npm', ['install', this.packageName, ...this.args], {
      cwd: this.context,
      stdio: 'inherit',
      env,
      extendEnv: false,
    });
  }
}

exports.ServerInstaller = ServerInstaller;

/**
 *
 * @param {string} cwd
 * @param {Array<string>} packages
 * @param {Array<string>} options
 * @returns
 */
function updater(cwd, packages, options = []) {
  return execa('npm', ['update', ...packages, ...options], {
    cwd,
    stdio: 'inherit',
  });
}

exports.updater = updater;
