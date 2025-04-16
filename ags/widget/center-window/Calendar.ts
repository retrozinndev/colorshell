import { register, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";

type CalendarProps = Pick<Widget.BoxProps, 
    "name" 
    | "className" 
    | "css" 
    | "expand"
    | "halign"
    | "valign"> & {

    showWeekDays?: boolean;
    showHeader?: boolean;
    fillGrid?: boolean; // I need a better name for this LMAOOO
};

@register({ GTypeName: "Calendar" })
class Calendar extends Gtk.Box {
    #showWeekDays = new Variable<boolean>(true);
    #showHeader = new Variable<boolean>(true);
    #fillGrid = new Variable<boolean>(false);

    set fillGrid(newValue: boolean) { this.#fillGrid.set(newValue); }
    get fillGrid() { return this.#fillGrid.get(); }
    set showHeader(newValue: boolean) { this.#showHeader.set(newValue); }
    get showHeader() { return this.#showHeader.get(); }
    set showWeekDays(newValue: boolean) { this.#showWeekDays.set(newValue); }
    get showWeekDays() { return this.#showWeekDays.get(); }

    constructor(props?: CalendarProps) {
        super();
        this.add(new Widget.Box({
            ...props,
            widthRequest: 128,
            heightRequest: 128,
            children: [
                new Widget.Box({
                    className: "header",
                    heightRequest: 24,
                    hexpand: true,

                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps));
    }
}
