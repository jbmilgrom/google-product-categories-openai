export type Queue<T> = {
    enqueue: (i: T) => void,
    dequeue: () => T,
    isEmpty: () => boolean,
    print: () => void,
}

export type Vertex<T> = {
    token: T,
    children: Vertices<T>,
}

export type Vertices<T> = Vertex<T>[];

export const makeQueue = <T>(): Queue<T> => {
    const q: T[] = [];

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
        print: () => console.log(q.join(", ")),
    };
}

export const createNode = <T>(token: T, children: Vertex<T>[] = []): Vertex<T> => ({
    token,
    children,
});

export const insert = <T>(nodes: Vertices<T>, path: Queue<T>): Vertices<T> => {
    let rootNodes = nodes;
    while (!path.isEmpty()) {
        const token = path.dequeue();
        const node = nodes.find(n => n.token === token);
        if (!node) {
            nodes.push(createNode(token)); // build out new path
            continue; 
        }
        nodes = node.children;
    }
    return rootNodes;
};

export const forEachBreadthFirst = <T>(nodes: Vertices<T>, cb: (node: Vertex<T>) => void): void => {
    nodes.forEach(n => {
        cb(n);
        forEachBreadthFirst(n.children, cb);
    });
}

export const maxDegree = <T>(nodes: Vertices<T>): number => {
    let degree = 0;
    forEachBreadthFirst(nodes, node => {
        const candidate = node.children.length;
        degree = candidate > degree ? candidate : degree;
    });
    return degree;
};

export const maxDepth = <T>(nodes: Vertices<T>): number => {
    const aggregateNodes = <T>(nodes: Vertices<T>, level: number): number => nodes.reduce((max, next) => {
        const candidate = countChildrenLevels(next, level);
        return candidate > max ? candidate : max;
    }, 0); 

    const countChildrenLevels = <T>(node: Vertex<T>, currentLevel: number): number => {
        if (node.children.length === 0) {
            return currentLevel; // leaf node
        }
        return aggregateNodes(node.children, currentLevel + 1)
    };

    return aggregateNodes(nodes, 1);
}
