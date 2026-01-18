export class PriorityQueue<T extends { time: number }> {
  constructor(private readonly items: T[] = []) {}

  getItems() {
    return this.items;
  }

  enqueue(item: T) {
    this.items.push(item);
    this.items.sort((a, b) => a.time - b.time);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  clone() {
    return new PriorityQueue<T>(this.toArray());
  }

  toArray() {
    return [...this.items];
  }
}
