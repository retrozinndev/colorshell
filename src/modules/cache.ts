import { register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";


@register({ GTypeName: "ClshCache" })
export class Cache extends GObject.Object {
    private static instance: Cache;
    
    #sections: Map<string, Map<string, unknown>> = new Map();
    #lastId: number = -1;

    constructor() {
        super();
    }


    /** creates new cache section, with optional items in it.
      * if a section already exists with this name, this method will overwrite it.
      * 
      * @param name the cache section's name */
    addSection(name: string): void {
        this.#sections.set(name, new Map());
    }

    /** check if a section with `name` exists.
      *
      * @param name the section name to check existence
      *
      * @returns `true` if a section was found with `name`, else, `false` */
    hasSection(name: string): boolean {
        return this.#sections.has(name);
    }

    /** checks if `section` contains the specified `itemKey`.
      * 
      * @param sectionName the section to search for the item
      * @param itemKey key to search for in `section`
      *
      * @returns true if `item` was found in `section`, or else, false */
    hasItem(sectionName: string, itemKey: string): boolean {
        return Boolean(this.#sections.get(sectionName)?.has(itemKey));
    }

    /** add a new cache `item` to the specified `section`.
      * if the specified section does not exist, the method will create it for you.
      * 
      * @param sectionName the section to add the item to
      * @param item the item object to be added to the specified section 
      * @param itemKey the access key for this item. leave `undefined` to generate a unique one for it */
    addItem(sectionName: string, item: unknown, itemKey?: string): void {
        if(!this.#sections.has(sectionName)) 
            this.#sections.set(sectionName, new Map());

        const section = this.#sections.get(sectionName)!;

        section.set(itemKey ?? this.generateID(), item);
    }

    /** get the list of items in `section`.
      *
      * @returns array of item keys from `section`. if `section` does not exist, an empty array. */
    getSectionItems(sectionName: string): Array<string> {
        const section = this.#sections.get(sectionName);
        if(section)
            return [...section.keys()];

        return [];
    }

    /** get a specific `item` from `section`.
      * if item or section is not found, the method returns `undefined`.
      * to return data as a specific type, you can manually set the first type parameter `T`.
      *
      * @param sectionName the section to get the item from
      * @param itemKey the access key that represents the item you want to get
      *
      * @returns the item data, or `undefined` if not found */
    getItem<T = unknown>(sectionName: string, itemKey: string): T|undefined {
        return this.#sections.get(sectionName)?.get(itemKey) as T;
    }

    /** remove the specified `section`.
      *
      * @param sectionName the section to be removed */
    removeSection(sectionName: string): void {
        this.#sections.delete(sectionName);
    }

    /** remove the specified `item` from `section`.
      * if the section does not exist, the call will be ignored.
      * 
      * @param sectionName the section to remove the item from
      * @param itemKey the access key for the item to be removed */
    removeItem(sectionName: string, itemKey: string): void {
        if(!this.#sections.has(sectionName))
            return;

        this.#sections.get(sectionName)!.delete(itemKey);
    }

    /** generates an unique identifier for an item in a section.
      * for the id to be actually `unique`, you must provide `sectionName`.
      * 
      * @param sectionName optional section to provide, it's used internally to check if 
      * there's already an item with the generated ID, which avoids accidentally replacing it */
    private generateID(sectionName?: string): string {
        let unusedId: string = String(this.#lastId+=1);

        if(sectionName !== undefined) {
            const section = this.#sections.get(sectionName)!;
            if(section.get(unusedId)) {
                while(!section.get(unusedId)) 
                    unusedId = String(this.#lastId+=1)
            }
        }

        return unusedId;
    }

    public static getDefault(): Cache {
        if(!this.instance)
            this.instance = new Cache();

        return this.instance;
    }
}
