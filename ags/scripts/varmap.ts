import { Subscribable } from "astal/binding";

export class VarMap<K, V> implements Subscribable {

    #subs = new Set<(v: Map<K, V>) => void>();
    #map: Map<K, V>;

    constructor(initial?: Map<K, V>) {
        this.#map = initial || new Map<K, V>();
    }

    private notifyMap() {
        const subs = this.#subs;
        for(const sub of subs) {
            sub(this.#map);
        }
    }

    public get(): Map<K, V> {
        return this.#map;
    }

    public get size(): number {
        return this.#map.size;
    }

    public getValue(key: K): (V|undefined) {
        return this.#map.get(key);
    }

    public getKeyAt(index: number): (K|undefined) {
        return [...this.#map.keys()][index];
    }

    public getValueAt(index: number): (V|undefined) {
        return [...this.#map.values()][index];
    }

    public set(key: K, value: V): Map<K, V> {
        const newMap: Map<K, V> = this.#map.set(key, value);
        this.notifyMap();

        return newMap;
    }

    public delete(key: K): boolean {
        const deleted: boolean = this.#map.delete(key);
        this.notifyMap();
        return deleted;
    }

    public has(key: K): boolean {
        return this.#map.has(key);
    }

    public clear(): void {
        this.#map.clear();
        this.notifyMap();
    }

    public entries(): MapIterator<[K, V]> {
        return this.#map.entries();
    }

    public keys(): MapIterator<K> {
        return this.#map.keys();
    }

    public values(): MapIterator<V> {
        return this.#map.values();
    }

    public forEach<ReturnType = any> (callback: (value: V, key: K, map: Map<K, V>) => ReturnType): ReturnType[] {
        const result: Array<ReturnType> = [];
        for(const entry of this.#map.entries()) {
            result.push(callback(entry[1], entry[0], this.#map));
        }

        return result;
    }

    public subscribe(callback: (v: Map<K, V>) => void): () => void {
        this.#subs.add(callback);

        return () => {
            this.#subs.delete(callback);
        }
    }
}
