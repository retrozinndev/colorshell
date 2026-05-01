import { property, register } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import ResultItem from "./ResultItem";
import GLib from "gi://GLib?version=2.0";
import { omitObjectKeys } from "../../modules/utils";
import GObject from "gi://GObject?version=2.0";


/** a scrolled `GtkListBox` implementation, with useful methods for a
  * search entry + result list layout.
  * this widget only works with `ResultItem` instances. please use integrated
  * methods instead of adding children directly to it with default methods 
  * like `set_child()` or `child.set_parent()`
  * */
@register({ GTypeName: "ClshResultsList" })
class ResultsList extends Gtk.Widget {
    #scrollAnimation: number|null = null;
    #scrollAnimationTime: number = 600;
    #scroll: Gtk.ScrolledWindow;
    #list: Gtk.ListBox;
    #items: Set<ResultItem> = new Set();

    /** maximum height for list content */
    @property(Number)
    maxContentSize: number = -1;

    constructor(props: Partial<ResultsList.ConstructorProps> = {}) {
        super(omitObjectKeys(props, [
            "maxContentSize"
        ]));

        if(props.maxContentSize !== undefined)
            this.maxContentSize = props.maxContentSize;

        this.set_layout_manager(Gtk.BinLayout.new());
        this.#list = new Gtk.ListBox({
            selectionMode: Gtk.SelectionMode.SINGLE,
            activateOnSingleClick: true
        });
        this.#scroll = new Gtk.ScrolledWindow({
            propagateNaturalHeight: true,
            child: this.#list,
            hscrollbarPolicy: Gtk.PolicyType.NEVER,
            vscrollbarPolicy: Gtk.PolicyType.AUTOMATIC,
            maxContentHeight: this.maxContentSize
        });
        this.#scroll.set_parent(this);

        this.bind_property("max-content-size", this.#scroll, "max-content-height", GObject.BindingFlags.BIDIRECTIONAL);

        const listConns: Array<number> = [
            this.#list.connect("row-selected", (_, row) => {
                if(!row) {
                    this.#scroll.get_vadjustment().set_value(0);
                    return;
                }

                const [, matrix] = row.compute_transform(this.#list);
                const target = matrix.get_y_translation() - row.get_allocated_height();
                this.animateScroll(target);
            })
        ];

        const id = this.connect("destroy", () => {
            this.disconnect(id);
            listConns.forEach(id => this.#list.disconnect(id));
        });
    }

    public static "new"(): ResultsList {
        return new ResultsList();
    }

    getSelected(): ResultItem|null {
        return this.#list.get_selected_row() as ResultItem|null;
    }

    /** clear all of the items in this list */
    clear(): void {
        this.#items.clear();
        this.#list.remove_all();
    }

    /** unselect the currently-selected result (if any) */
    unselect(): void {
        this.#list.unselect_all();
    }

    /** animate scroll to `targetY` */
    private animateScroll(targetY: number): void {
        const adjustment = this.#scroll.get_vadjustment();
        let startTime: number|null = null;

        this.stopScrollAnimation();
        this.#scrollAnimation = this.#scroll.add_tick_callback((_, clock) => {
            const time = clock.get_frame_time() / 1000;
            startTime ??= time;
            const fraction = Math.min(1, (time - startTime) / this.#scrollAnimationTime);

            if(fraction < 1) {
                const value = adjustment.get_value() + (targetY - adjustment.get_value()) * fraction;
                adjustment.set_value(value);

                return GLib.SOURCE_CONTINUE;
            }

            startTime = null;
            this.#scrollAnimation = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    /** stop animation if it's currently happening */
    private stopScrollAnimation(): void {
        if(this.#scrollAnimation === null)
            return;

        this.#scroll.remove_tick_callback(this.#scrollAnimation);
    }

    select(index: number): ResultItem|null;
    select(item: ResultItem): ResultItem|null;
    select(i: ResultItem|number): ResultItem|null {
        if(typeof i === "number") {
            const item = [...this.#items.values()][i];

            if(item) {
                this.#list.select_row(item);
                return item;
            }

            return null;
        }

        if(this.#items.has(i)) {
            this.#list.select_row(i);
            return i;
        }

        return null;
    }

    /** select the previous `ResultItem` to currently-selected one (if any) */
    selectPrevious(): void {
        const selected = this.getSelected(),
            previous = selected?.get_prev_sibling() as ResultItem|undefined;

        if(!selected || !previous)
            return;

        this.#list.select_row(previous);
    }
    
    /** select the previous `ResultItem` to currently-selected one (if any) */
    selectNext(): void {
        const selected = this.getSelected(),
            next = selected?.get_next_sibling() as ResultItem|undefined;

        if(!selected || !next)
            return;

        this.#list.select_row(next);
    }

    /** prepend a `ResultItem` to the list */
    prepend(item: ResultItem): void {
        if(!(item instanceof ResultItem))
            throw new Error("Provided item is not a valid ResultItem instance");

        this.#list.prepend(item);
        this.#items.add(item);
    }

    /** append a `ResultItem` to the list */
    append(item: ResultItem): void {
        if(!(item instanceof ResultItem))
            throw new Error("Provided item is not a valid ResultItem instance");

        this.#list.append(item);
        this.#items.add(item);
    }

    /** insert a `ResultItem` to a specific position of the list.
      * if `pos` is <= `-1` higher than the total number of items,
      * the item will be added to the end of the list */
    insert(item: ResultItem, pos: number): void {
        if(!(item instanceof ResultItem))
            throw new Error("Provided item is not a valid ResultItem instance");

        this.#list.insert(item, pos);
        this.#items.add(item);
    }

    /** remove an item from the list by its index */
    remove(index: number): boolean;
    /** remove an item from the list using a reference of it */
    remove(item: ResultItem): boolean;

    remove(i: ResultItem|number): boolean {
        if(typeof i === "number") {
            const item = [...this.#items.values()][i];
            
            if(item !== undefined) {
                this.#list.remove(item);
                return true;
            }

            return false;
        }

        if(this.#items.has(i)) {
            this.#list.remove(i);
            return true;
        }

        return false;
    }

}


namespace ResultsList {
    export interface ConstructorProps extends Gtk.Widget.ConstructorProps {
        maxContentSize: number;
    }
    export interface SignalSignatures extends Gtk.Widget.SignalSignatures {}
}

export default ResultsList;
