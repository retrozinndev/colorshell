import { getter, gtype, register } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import { Page } from "../Page";
import GLib from "gi://GLib?version=2.0";
import GObject from "gi://GObject?version=2.0";


@register({ GTypeName: "Pages" })
export class Pages extends Gtk.Box {
    declare readonly $signals: Pages.SignalSignatures;
    declare readonly $readableProperties: Pages.ReadableProperties;
    declare readonly $readWriteProperties: Gtk.Box.ReadWriteProperties;
    declare readonly $constructOnlyProperties: Pages.ConstructOnlyProperties;

    #timeouts: Array<[GLib.Source, (() => void)|undefined]> = [];
    #page: Page|undefined;
    #transDuration: number;
    #transType: Gtk.RevealerTransitionType = Gtk.RevealerTransitionType.SLIDE_DOWN;

    @getter(Boolean)
    get isOpen() { return Boolean(this.#page); }

    @getter(gtype<Page|undefined>(Page))
    get page() { return this.#page; }


    constructor(props?: Partial<GObject.ConstructorProps<Pages>>) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            cssName: "pages",
            name: "pages"
        });

        this.add_css_class("pages");
        this.#transDuration = props?.transitionDuration ?? 280;

        if(props?.initialPage) 
            this.open(props.initialPage);


        const destroyId = (this as Pages).connect("destroy", () => {
            GObject.signal_handler_is_connected(this, destroyId) && 
                this.disconnect(destroyId);

            this.#timeouts.forEach((tmout) => {
                tmout[0].destroy();
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
        newPage.emit("open");
        onOpen?.();
    }

    close(onClosed?: () => void): void {
        const page = this.get_first_child() as Gtk.Revealer|null;
        if(!page) return;

        this.#page?.emit("closed");
        this.#page = undefined;

        page.set_reveal_child(false);
        this.#timeouts.push([
            setTimeout(() => {
                this.remove(page);
                onClosed?.();
            }, page.transitionDuration),
            onClosed
        ]);
    }
}

export namespace Pages {
    export interface SignalSignatures extends Gtk.Box.SignalSignatures {
        "notify::is-open"(): void;
        "notify::page"(): void;
    }

    export interface ConstructOnlyProperties extends Gtk.Box.ConstructOnlyProperties {
        "initial-page": Page;
        "transition-duration": number;
    }

    export interface ReadableProperties extends Gtk.Box.ReadableProperties {
        "page": Page|null;
        "is-open": boolean;
    }
}
