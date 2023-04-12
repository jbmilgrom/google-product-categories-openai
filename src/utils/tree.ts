export type Queue<T> = {
  enqueue: (i: T) => void;
  dequeue: () => T;
  isEmpty: () => boolean;
  toString: (delimiter?: string) => string;
  toList: () => T[];
  copy: () => Queue<T>;
};

/**
 * A node in the tree. We must call it a "Vertex" instead of Node because of a naming collision with NodeJS types.
 */
export type Vertex<T> = {
  value: T;
  children: Vertices<T>;
};

/**
 * The this is the "Tree" type. We represent as a list of nodes instead of a single root node
 * for more generality.
 */
export type Vertices<T> = Vertex<T>[];

export const makeQueue = <T>(q: T[] = []): Queue<T> => {
  const isEmpty = () => q.length === 0;

  return {
    enqueue: (i: T) => q.push(i),
    dequeue: () => {
      if (isEmpty()) {
        throw new Error("Nothing to dequeue");
      }
      return q.shift()!;
    },
    isEmpty,
    toString: (delimiter = ",") => q.join(delimiter),
    copy: () => makeQueue([...q]),
    toList: () => [...q],
  };
};

export const insert = <T>(nodes: Vertices<T>, path: Queue<T>): Vertices<T> => {
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

export const traverse = <T>(nodes: Vertices<T>, path: Queue<T>): Vertex<T> | null => {
  let node: Vertex<T>;
  while (!path.isEmpty()) {
    const value = path.dequeue();
    const candidate = nodes.find((n) => n.value === value);
    if (!candidate) {
      return null;
    }
    node = candidate;
    nodes = node.children;
  }
  return node!; // we know not null because a missing candidate returns early
};

export const maxDegree = <T>(nodes: Vertices<T>): [T | null, number] => {
  let max = 0;
  let maxValue: T | null = null;
  forEachBreadthFirst(nodes, (node) => {
    const candidate = node.children.length;
    if (candidate < max) {
      return;
    }
    maxValue = node.value;
    max = candidate;
  });
  return [maxValue, max];
};

export const maxDepth = <T>(nodes: Vertices<T>): number => {
  const aggregateNodes = <T>(nodes: Vertices<T>, level: number): number =>
    nodes.reduce((max, next) => {
      const candidate = countChildrenLevels(next, level);
      return candidate > max ? candidate : max;
    }, 0);

  const countChildrenLevels = <T>(node: Vertex<T>, currentLevel: number): number => {
    if (node.children.length === 0) {
      return currentLevel; // leaf node
    }
    return aggregateNodes(node.children, currentLevel + 1); // has children
  };

  return aggregateNodes(nodes, 1);
};

export const toList = <T>(nodes: Vertices<T>): T[] => nodes.map((n) => n.value);

const forEachBreadthFirst = <T>(nodes: Vertices<T>, cb: (node: Vertex<T>) => void): void => {
  nodes.forEach((n) => {
    cb(n);
    forEachBreadthFirst(n.children, cb);
  });
};

const createNode = <T>(value: T, children: Vertex<T>[] = []): Vertex<T> => ({
  value,
  children,
});
