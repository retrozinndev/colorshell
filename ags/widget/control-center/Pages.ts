import { register, timeout } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Page } from "./pages/Page";


export { Pages };
export type PagesProps = {
    initialPage?: Page;
    className?: string;
    transitionDuration?: number;
};

@register({ GTypeName: "Pages" })
class Pages extends Widget.Box {
    #page: (Page|undefined);
    #transDuration: number;
    #transType: Gtk.RevealerTransitionType = Gtk.RevealerTransitionType.SLIDE_DOWN;

    get isOpen() { return (this.get_children().length > 0); }

    constructor(props?: PagesProps) {
        super({
            className: props?.className,
            orientation: Gtk.Orientation.VERTICAL
        });

        this.name = "pages";

        if(props?.className !== null && props?.className !== undefined)
            this.className = props?.className;

        this.#transDuration = props?.transitionDuration ?? 280;

        if(props?.initialPage) 
            this.open(props.initialPage);
    }

    toggle(newPage?: Page, onToggled?: () => void): void {
        if(!newPage || (this.#page?.id === newPage?.id)) {
            this.close(onToggled);
            return;
        }

        if(!this.isOpen) {
            newPage && this.open(newPage, onToggled);
            return;
        }

        if(this.#page?.id !== newPage.id) {
            this.close();
            this.open(newPage, onToggled);
        }
    }

    open(newPage: Page, onOpened?: () => void) {
        this.add(new Widget.Revealer({
            transitionDuration: this.#transDuration,
            transitionType: this.#transType,
            revealChild: false,
            child: newPage
        } as Widget.RevealerProps));
        this.#page = newPage;

        this.reorder_child(this.get_children()[this.get_children().length - 1], 0);
        (this.get_children()[0] as Widget.Revealer).set_reveal_child(true);
        onOpened?.();
    }

    close(onClosed?: () => void): void {
        (this.get_children() as Array<Widget.Revealer>).forEach((pageRevealer, i, pageRevealers) => {
            pageRevealer.set_reveal_child(false);
            if(this.#page?.id === (pageRevealer.get_child() as Page).id)
                this.#page = undefined;

            timeout(this.#transDuration, () => {
                this.remove(pageRevealer);
                pageRevealer.destroy();

                i === (pageRevealers.length - 1) && 
                    onClosed?.();
            });
        });
    }
}
