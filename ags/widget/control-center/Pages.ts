import { property, register, timeout } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Page } from "./pages/Page";


export { Pages };
export type PagesProps = {
    initialPage?: Page;
    className?: string;
    transitionType?: Gtk.RevealerTransitionType;
    transitionDuration?: number;
};

@register({ GTypeName: "Pages" })
class Pages extends Widget.Revealer {
    #page: (Page|undefined);

    @property(Page)
    get page(): Page | undefined { return this.#page; }
    private set page(newPage: Page | undefined) {
        this.#page = newPage;
        this.notify("page");
    }

    get isOpen() { return this.revealChild; }

    constructor(props?: PagesProps) {
        super({
            className: props?.className
        });

        this.name = "pages";

        if(props?.className !== null && props?.className !== undefined)
            this.className = props?.className;

        this.transitionType = props?.transitionType ?? 
            Gtk.RevealerTransitionType.SLIDE_DOWN;
        
        this.transitionDuration = props?.transitionDuration ?? 350;

        if(props?.initialPage) 
            this.open(props.initialPage);
    }

    toggle(newPage?: Page): void {
        if(this.isOpen) {
            if(newPage && this.#page!.id !== newPage.id) {
                this.close(() => this.open(newPage));
                return;
            }

            this.close();
            return;
        }

        if(newPage) this.open(newPage);
    }

    open(newPage: Page, onOpened?: () => void) {
        if(this.isOpen) return;

        this.page = newPage;
        this.add(newPage);
        this.revealChild = true;
        onOpened && timeout(this.transitionDuration, onOpened);
    }

    close(onClosed?: () => void): void {
        if(!this.isOpen) return;

        this.revealChild = false;
        timeout(this.transitionDuration, () => {
            this.remove(this.#page!);
            this.page = undefined;
            onClosed?.();
        });
    }
}
