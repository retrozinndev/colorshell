import { register } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import { Page } from "./pages/Page";
import AstalIO from "gi://AstalIO";
import { timeout } from "ags/time";
import { variableToBoolean } from "../../scripts/utils";


export { Pages };
export type PagesProps = {
    initialPage?: Page;
    class?: string;
    transitionDuration?: number;
};

@register({ GTypeName: "Pages" })
class Pages extends Gtk.Box {
    #timeouts: Array<[AstalIO.Time, (() => void)|undefined]> = [];
    #page: (Page|undefined);
    #pageWidget: (Gtk.Revealer|undefined);
    #transDuration: number;
    #transType: Gtk.RevealerTransitionType = Gtk.RevealerTransitionType.SLIDE_DOWN;

    get isOpen() { return Boolean(this.get_first_child()); }

    constructor(props?: PagesProps) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            cssName: "pages"
        });

        this.name = "pages";
        props?.class?.split(' ').filter(variableToBoolean).forEach(clss =>
            this.add_css_class(clss));

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
        const pageWidget = <Gtk.Revealer
          transitionDuration={this.#transDuration}
          transitionType={this.#transType}
          revealChild={false}>

            {newPage as unknown as Gtk.Widget}
        </Gtk.Revealer> as Gtk.Revealer;

        this.prepend(pageWidget);

        this.#pageWidget = pageWidget;
        this.#page = newPage;

        this.reorder_child_after(this.get_last_child()!, null);
        (this.get_first_child() as Gtk.Revealer).revealChild = true;
        onOpened?.();
    }

    close(onClosed?: () => void): void {
        if(!this.#pageWidget) return;

        this.#pageWidget.revealChild = false;
        const closingPage = this.#pageWidget!;

        this.#timeouts.push([
            timeout(closingPage.transitionDuration, () => {
                this.remove(closingPage);
                onClosed?.();
            }),
        onClosed]);

        this.#pageWidget = undefined;
    }
}
