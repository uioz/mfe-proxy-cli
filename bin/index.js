#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { MANIFEST_FILE_NAME } = require('../src/common');

program
  .version(
    `${require('../package.json').name} ${require('../package.json').version}`
  )
  .usage('<command> [options]');

// program
//   .command(`add <packageName...>`)
//   .description('to adds more package on this project')
//   .option(
//     '-r, --registry <url>',
//     'Use specified npm registry when installing packages'
//   )
//   .option(
//     '-m, --manifest-name <name>',
//     `Use more specific name instead of '${MANIFEST_FILE_NAME}' by default`,
//     MANIFEST_FILE_NAME
//   )
//   .option(
//     '--no-manifest',
//     `Don't genterator ${MANIFEST_FILE_NAME} for server when finish`,
//     false
//   )
//   .action(require('../src/create-command'));

program
  .command('create <projectName> <packageName...>')
  .description(
    `packageName support all that npm install command support.
packageName also support [packageName]<registry> to specify registry of each package
eg. [@vue/cli]<http://localhost:8080>`,
    {
      projectName: 'a folder',
      packageName: 'package name that npm install will use it.',
    }
  )
  .option(
    '-n, --to-npm <anyoption...>',
    'anything that npm install command support'
  )
  .option(
    '-m, --manifest-name <name>',
    `Use more specific name instead of '${MANIFEST_FILE_NAME}' by default`,
    MANIFEST_FILE_NAME
  )
  .option(
    '--no-manifest',
    `Don't genterator ${MANIFEST_FILE_NAME} for server when finish`,
    false
  )
  .action(require('../src/create-command'));

program.program.parse(process.argv);
