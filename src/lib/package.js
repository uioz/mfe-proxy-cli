'use strict';

const path = require('path');
const { writeFile } = require('fs/promises');
const execa = require('execa');

async function initPackage(context) {
  await execa('npm', ['init', '-y'], {
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
