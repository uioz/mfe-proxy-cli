#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { MANIFEST_FILE_NAME } = require('../src/common');

program
  .version(
    `${require('../package.json').name} ${require('../package.json').version}`
  )
  .usage('<command> [options]');

program
  .command(`create <packageName...>`)
  .description(
    `
    create project with following package name.
    eg. <@scope/>name<@tag> or <@scope/>name<@tag>=<registry>
  `
  )
  .option(
    '-r, --registry <url>',
    'Use specified npm registry when installing packages'
  )
  // .option(
  //   '-s, --serve',
  //   'Use mfe-proxy-server host this project at 0,0,0,0:80 when after installed',
  //   false
  // )
  // .option("-p,  --port <port>")
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

// process.command('add <packageName...>')

// program
//   .command("serve")
//   .description("host")
//   .action(() => {
//     // TODO:
//   });

program.parse(process.argv);
