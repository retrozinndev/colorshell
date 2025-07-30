import { register } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import { Page } from "./pages/Page";
import { timeout } from "ags/time";

import AstalIO from "gi://AstalIO";


export { Pages };
export type PagesProps = {
    initialPage?: Page;
    transitionDuration?: number;
};

@register({ GTypeName: "Pages" })
class Pages extends Gtk.Box {
    #timeouts: Array<[AstalIO.Time, (() => void)|undefined]> = [];
    #page: (Page|undefined);
    #transDuration: number;
    #transType: Gtk.RevealerTransitionType = Gtk.RevealerTransitionType.SLIDE_DOWN;

    get isOpen() { return Boolean(this.#page); }
    get page() { return this.#page; }

    constructor(props?: PagesProps) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            cssName: "pages",
            name: "pages"
        });

        this.add_css_class("pages");

        this.#transDuration = props?.transitionDuration ?? 280;

        if(props?.initialPage) 
            this.open(props.initialPage);


        const destroyId = this.connect("destroy", () => {
            this.disconnect(destroyId);
            this.#timeouts.forEach((tmout) => {
                tmout[0].cancel();
                (async () => tmout[1]?.())().catch((err: Error) => {
                    console.error(`${err.message}\n${err.stack}`);
                });
            });
        });
    }

    toggle(newPage?: Page, onToggled?: () => void): void {
        if(!newPage || (this.#page?.id === newPage.id)) {
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

    open(newPage: Page, onOpen?: () => void) {
        this.#page = newPage;

        this.prepend(
            <Gtk.Revealer revealChild={false} transitionType={this.#transType}
              transitionDuration={this.#transDuration}>

                {newPage.create()}
            </Gtk.Revealer> as Gtk.Revealer
        );

        (this.get_first_child() as Gtk.Revealer)?.set_reveal_child(true);
        onOpen?.();
    }

    close(onClosed?: () => void): void {
        const page = this.get_first_child() as Gtk.Revealer|null;
        if(!page) return;

        this.#page?.actionClosed?.();
        this.#page = undefined;

        page.set_reveal_child(false);
        this.#timeouts.push([
            timeout(page.transitionDuration, () => {
                this.remove(page);
                onClosed?.();
            }),
            onClosed
        ]);
    }
}
