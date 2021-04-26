/**
 *
 * @param {string} path
 */
function normalizePath(path, originEnd = false) {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  if (!originEnd && !path.endsWith('/')) {
    path = `${path}/`;
  }
  return path;
}

/**
 *
 * @param {string} pre
 * @param {string} post
 */
function joinPath(pre, post, originEnd = false) {
  pre = normalizePath(pre);

  if (post.startsWith('/')) {
    post = post.substring(1);
  }

  if (!originEnd && !post.endsWith('/')) {
    post = `${post}/`;
  }

  return pre + post;
}

module.exports = {
  joinPath,
  normalizePath,
};
