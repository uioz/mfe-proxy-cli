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
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    });
  }
}

exports.Installer = Installer;

class ServerInstaller extends Installer {
  async download(env) {
    await execa('npm', ['install', this.packageName, ...this.args], {
      cwd: this.context,
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
      env,
      extendEnv: false,
    });
  }
}

exports.ServerInstaller = ServerInstaller;
