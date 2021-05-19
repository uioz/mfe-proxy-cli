'use strict';

const execa = require('execa');

/**
 *
 * @param {*} env
 * @param {import('./npm-wrapper').ServerInstaller} installer
 */
function install(options, installer) {
  const env = {};

  if (options.port) {
    env.MFE_SERVER_PORT = options.port;
  }
  if (options.host) {
    env.MFE_SERVER_HOST = options.host;
  }
  if (options.mode) {
    env.MFE_SERVER_MODE = options.mode;
  }

  return installer.download(env);
}

exports.install = install;

function run(context) {
  return execa('npm', ['run', 'serve'], {
    cwd: context,
    detached: true,
    stdio: 'inherit',
  });
}

exports.run = run;
