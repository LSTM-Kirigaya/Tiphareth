export class SizedQueue<T> {
    private items: T[] = [];
    private maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    // 入队
    enqueue(item: T): void {
        if (this.items.length >= this.maxSize) {
            this.items.shift(); // 如果队列已满，移除队首元素
        }
        this.items.push(item);
    }

    // 出队
    dequeue(): T | undefined {
        return this.items.shift();
    }

    // 查看队首元素
    peek(): T | undefined {
        return this.items[0];
    }

    // 判断队列是否为空
    isEmpty(): boolean {
        return this.items.length === 0;
    }

    // 获取队列长度
    size(): number {
        return this.items.length;
    }

    // 获取队列最大容量
    getMaxSize(): number {
        return this.maxSize;
    }
}
