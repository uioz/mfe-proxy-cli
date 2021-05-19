'use strict';

const { ServerInstaller } = require('./lib/npm-wrapper');
const server = require('./lib/server');
const {
  readPackageJson,
  writePackageJson,
  setupServeScript,
} = require('./lib/package');

const CWD = process.cwd();

module.exports = async function serverInstallCommandHandler(options) {
  if (options.inject) {
    await writePackageJson(CWD, setupServeScript(readPackageJson(CWD)));
  }

  await server.install(
    options,
    new ServerInstaller('mfe-proxy-server@latest', CWD)
  );

  if (options.serve) {
    await server.run(CWD);
  }
};
