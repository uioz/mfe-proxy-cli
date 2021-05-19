'use strict';

const path = require('path');
const { updater } = require('./lib/npm-wrapper');
const CWD = process.cwd();

/**
 *
 * @param {string} path
 * @returns {Array<string>}
 */
function getPackageNames(path) {
  const manifest = require(path);

  return manifest.applications.map((info) => info.name);
}

module.exports = async function updateCommandHandler(commands, options) {
  // TODO: 假设 packageNames 没有 tag
  let packageNames = getPackageNames(path.join(CWD, options.manifest));

  if (commands.length) {
    // 我们只处理那些存在于 manifest 文件中的 package
    const outsidePackageNameSet = new Set(commands);
    packageNames = packageNames.filter((name) =>
      outsidePackageNameSet.has(name)
    );
  }

  // TODO: 需要在 create 的时候记录 registry 顺便支持类似 create 的特殊 registry 的语法
  await updater(CWD, packageNames, options.toNpm);
};
