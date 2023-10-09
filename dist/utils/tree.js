"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forEachBreadthFirst =
  exports.getValues =
  exports.removeChildren =
  exports.purge =
  exports.search =
  exports.find =
  exports.insert =
  exports.makeStack =
  exports.makeQueue =
    void 0;
const makeQueue = (q = []) => {
  const isEmpty = () => q.length === 0;
  return {
    enqueue: (i) => q.push(i),
    dequeue: () => {
      if (isEmpty()) {
        throw new Error("Nothing to dequeue");
      }
      return q.shift();
    },
    isEmpty,
    copy: () => (0, exports.makeQueue)([...q]),
    toList: () => [...q],
  };
};
exports.makeQueue = makeQueue;
const makeStack = (s = []) => {
  const isEmpty = () => s.length === 0;
  return {
    push: (i) => s.push(i),
    pop: () => {
      if (isEmpty()) {
        throw new Error("Nothing to pop");
      }
      return s.pop();
    },
    peak: () => {
      if (isEmpty()) {
        throw new Error("Nothing to peak");
      }
      return s[s.length - 1];
    },
    toList: () => [...s],
    isEmpty,
  };
};
exports.makeStack = makeStack;
const insert = (nodes, path) => {
  const rootNodes = nodes;
  while (!path.isEmpty()) {
    const value = path.dequeue();
    let node = nodes.find((n) => n.value === value);
    if (!node) {
      // if no node already exists, build out path with new root
      node = createNode(value);
      nodes.push(node);
    }
    nodes = node.children;
  }
  return rootNodes;
};
exports.insert = insert;
const find = (nodes, { path }) => {
  let node;
  while (!path.isEmpty()) {
    const value = path.dequeue();
    const candidate = nodes.find((n) => n.value === value);
    if (!candidate) {
      return null;
    }
    node = candidate;
    nodes = node.children;
  }
  return node; // we know not null because a missing candidate returns early
};
exports.find = find;
const search = (nodes, match) => {
  let matches = [];
  (0, exports.forEachBreadthFirst)(nodes, (node) => {
    if (match(node)) {
      matches.push(node);
    }
  });
  return matches;
};
exports.search = search;
/**
 * Purge/remove a path from a tree.
 *
 * @param nodes
 * @param param1
 * @returns
 */
const purge = (nodes, { path }) => {
  let children = nodes;
  while (!path.isEmpty()) {
    const value = path.dequeue();
    const node = children.find((n) => n.value === value);
    const index = children.findIndex((n) => n.value === value);
    if (!node) {
      return false;
    }
    children.splice(index, 1);
    children = node.children;
  }
  return true;
};
exports.purge = purge;
/**
 * Remove a node's children at certain paths
 *
 * @param nodes
 * @param param1
 * @returns
 */
const removeChildren = (nodes, { path }) => {
  const node = (0, exports.find)(nodes, { path });
  if (!node) {
    return false;
  }
  node.children = [];
  return true;
};
exports.removeChildren = removeChildren;
const getValues = (nodes) => nodes.map((n) => n.value);
exports.getValues = getValues;
const forEachBreadthFirst = (nodes, cb) => {
  const orchestrate = (nodes, level) => {
    nodes.forEach((n) => {
      cb(n, level);
      orchestrate(n.children, level + 1);
    });
  };
  orchestrate(nodes, 1);
};
exports.forEachBreadthFirst = forEachBreadthFirst;
const createNode = (value, children = []) => ({
  value,
  children,
});
