'use strict';

const path = require('path');
const { updater } = require('./lib/npm-wrapper');
const CWD = process.cwd();

/**
 *
 * @param {Array<string>} packageNames
 * @param {*} param1
 * @returns
 */
function analyzePackage(packageNames, { applications }) {
  const map = {};

  for (const packageName of packageNames) {
    const { registry } = applications.find((app) => app.name === packageName);

    // registry could be a null
    if (registry) {
      if (map[registry]) {
        map[registry].push(packageName);
      } else {
        map[registry] = [packageName];
      }
    }
  }

  return map;
}

module.exports = async function updateCommandHandler(commands, options) {
  const manifest = require(path.join(CWD, options.manifest));

  let packageNames = manifest.applications.map((info) => info.name);

  if (commands.length) {
    // 我们只处理那些存在于 manifest 文件中的 package
    const outsidePackageNameSet = new Set(commands);
    packageNames = packageNames.filter((name) =>
      outsidePackageNameSet.has(name)
    );
  }

  const toNpm = options.toNpm ?? [];

  if (packageNames.length) {
    const registryMap = analyzePackage(packageNames, manifest);

    for (const [registry, packageNames] of Object.entries(registryMap)) {
      await updater(CWD, packageNames, toNpm.concat('--registry', registry));
    }
  }
};
