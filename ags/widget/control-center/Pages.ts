import { timeout, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Page } from "./pages/Page";

const currentPage = new Variable<Page | undefined>(undefined);
let pagesInstance: (Widget.Revealer | undefined);

export const PagesWidget = () => {
    const revealer = new Widget.Revealer({
        revealChild: false,
        className: "pages",
        transitionType: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transitionDuration: 360,
        child: currentPage((page: (Page|undefined)) => 
            !page ? new Widget.Box() : page.getPage())
    } as Widget.RevealerProps);

    pagesInstance = revealer;

    return revealer;
}

export function showPages(page: Page): void {
    if(!pagesInstance) return;

    currentPage.set(page);
    pagesInstance.set_reveal_child(true);
    page.props.onOpen && page.props.onOpen();
}

export function getPage(): (Page|undefined) {
    return currentPage.get();
}

export function togglePage(page: Page): void {
    if(!pagesInstance) return;

    if(!pagesInstance.revealChild) {
        showPages(page);
        return;
    }

    hidePages();
}

export function hidePages() {
    if(!pagesInstance) return;

    pagesInstance.set_reveal_child(false);
    if(!currentPage.get()) return;

    timeout(pagesInstance.transitionDuration || 500, () => {
        if(currentPage.get() && currentPage.get()?.props.onClose) 
            currentPage.get()!.props.onClose!();

        currentPage.set(undefined);
    });
}
