export type Queue<T> = {
    enqueue: (i: T) => void,
    dequeue: () => T,
    isEmpty: () => boolean,
    print: () => void,
}

export type Vertex<T> = {
    value: T,
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

export const createNode = <T>(value: T, children: Vertex<T>[] = []): Vertex<T> => ({
    value,
    children,
});

export const insert = <T>(nodes: Vertices<T>, path: Queue<T>): Vertices<T> => {
    let rootNodes = nodes;
    while (!path.isEmpty()) {
        const token = path.dequeue();
        const node = nodes.find(n => n.value === token);
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

export const maxDegree = <T>(nodes: Vertices<T>): [T | null, number] => {
    let max = 0;
    let maxValue: T | null = null;
    forEachBreadthFirst(nodes, node => {
        const candidate = node.children.length;
        if (candidate > max) {
            maxValue = node.value;
            max = candidate;
            return;
        }

    });
    return [maxValue, max];
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
