import { Gtk } from "ags/gtk4";
import Page from "../Page";
import GObject from "gi://GObject?version=2.0";
import { getter, gtype, register, setter } from "ags/gobject";


@register({ GTypeName: "ClshCCPages", Implements: [Gtk.Buildable] })
class Pages extends Gtk.Overlay {
    readonly #stack: Gtk.Stack;
    readonly #revealer: Gtk.Revealer;

    @getter(gtype<Gtk.RevealerTransitionType>(Number))
    get revealTransitionType(): Gtk.RevealerTransitionType {
        return this.#revealer.transitionType;
    }
    @setter(gtype<Gtk.RevealerTransitionType>(Number))
    set revealTransitionType(transition: Gtk.RevealerTransitionType) {
        this.#revealer.transitionType = transition;
        this.notify("reveal-transition-type");
    }

    @getter(gtype<Gtk.StackTransitionType>(Number))
    get pageTransitionType(): Gtk.StackTransitionType {
        return this.#stack.transitionType;
    }
    @setter(gtype<Gtk.StackTransitionType>(Number))
    set pageTransitionType(transition: Gtk.StackTransitionType) {
        this.#stack.transitionType = transition;
        this.notify("page-transition-type");
    }

    @getter(Boolean)
    get isOpen() { return this.#revealer.revealChild; }

    @getter(GObject.Object)
    get currentPage() { return this.#stack.visibleChild as Page; }

    @getter(gtype<string|null>(String))
    get currentPageId() { return this.#stack.visibleChildName; }


    constructor({
        revealTransitionType, pageTransitionType, ...props
    }: Partial<Pages.ConstructorProps> = {}) {
        super({
            cssName: "pages",
            ...props
        });

        this.#stack = new Gtk.Stack({
            visible: true,
            transitionType: pageTransitionType ?? 
                Gtk.StackTransitionType.SLIDE_LEFT_RIGHT
        });
        this.#revealer = new Gtk.Revealer({
            visible: true,
            child: this.#stack,
            revealChild: false,
            vexpand: false,
            hexpand: false,
            valign: Gtk.Align.CENTER,
            transitionType: revealTransitionType ?? 
                Gtk.RevealerTransitionType.SLIDE_DOWN
        });

        this.add_overlay(this.#revealer);
        this.set_measure_overlay(this.#revealer, false);
    }

    vfunc_add_child(builder: Gtk.Builder, child: GObject.Object, type: string): void {
        if(type === "page" && child instanceof Page) {
            this.add(child);
            return;
        }

        if(child instanceof Gtk.Widget) {
            this.child = child;
            return;
        }

        super.vfunc_add_child(builder, child, type);
    }

    vfunc_notify(pspec: GObject.ParamSpec): void {
        switch(pspec.name) {
            case "is-open": {
                if(this.isOpen) {
                    !this.has_css_class("overlay-open") &&
                        this.add_css_class("overlay-open");

                    if(this.child)
                        this.child.canTarget = false;
                } else {
                    this.remove_css_class("overlay-open");
                    if(this.child)
                        this.child.canTarget = true;
                }
                break;
            };
        }
    }

    add(page: Page, id?: string): boolean {
        id ??= page.id;

        if(this.#stack.get_child_by_name(id)) {
            console.error(`Page with ID "${id}" already exists in the Pages Widget`);
            return false;
        }

        this.#stack.add_named(page, id);
        return true;
    }

    remove(page: Page): void;
    /** remove a `Page` by its ID */
    remove(id: string): void;
    remove(id: Page|string): void {
        if(typeof id === "string") {
            const child = this.#stack.get_child_by_name(id);
            if(id === this.currentPageId)
                this.close();

            child && this.#stack.remove(child);
            return;
        }

        if(id.id === this.currentPageId)
            this.close();

        this.#stack.remove(id);
    }

    toggle(id: string): void {
        if(this.currentPageId === id && this.isOpen) {
            this.close();
            return;
        }

        this.open(id);
    }

    open(id: string) {
        if(this.#stack.visibleChildName === id && this.isOpen)
            return;

        this.#revealer.revealChild ||= true;
        this.#stack.visibleChildName = id;
        (this.#stack.get_child_by_name(id) as Page|undefined)?.emit("open");
        this.notify("is-open");
    }

    close(): void {
        if(!this.isOpen)
            return;

        (this.#stack.visibleChild as Page|undefined)?.emit("closed");
        this.#revealer.revealChild = false;
        this.notify("is-open");
    }
}

namespace Pages {
    export interface ConstructorProps extends Gtk.Revealer.ConstructorProps {
        revealTransitionType: Gtk.RevealerTransitionType;
        pageTransitionType: Gtk.StackTransitionType;
    }
}

export default Pages;
