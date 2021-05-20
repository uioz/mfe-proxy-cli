'use strict';

const path = require('path');
const { writeFile } = require('fs/promises');
const execa = require('execa');

function initPackage(context) {
  return execa('npm', ['init', '-y'], {
    cwd: context,
    stdio: 'inherit',
  });
}

exports.initPackage = initPackage;

/**
 *
 * @param {string} context
 */
function readPackageJson(context) {
  return require(path.join(context, 'package.json'));
}

exports.readPackageJson = readPackageJson;

/**
 *
 * @param {string} context
 * @param {object} data
 */
function writePackageJson(context, data) {
  return writeFile(
    path.join(context, 'package.json'),
    JSON.stringify(data, undefined, '  ')
  );
}

exports.writePackageJson = writePackageJson;

function setupServeScript(packageJson) {
  const command = {
    serve: 'node ./mfe-server.js',
  };

  if (packageJson.scripts) {
    Object.assign(packageJson.scripts, command);
  } else {
    packageJson.scripts = command;
  }

  return packageJson;
}

exports.setupServeScript = setupServeScript;
