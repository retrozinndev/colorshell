import { AstalIO, timeout, Variable } from "astal";
import { Gdk, Gtk, Widget } from "astal/gtk3";
import { PopupWindow, PopupWindowProps } from "../widget/PopupWindow";
import { updateApps } from "../scripts/apps";
import { handleShell } from "../scripts/runner/shell";
import { handleWebSearch } from "../scripts/runner/websearch";
import { handleApplications } from "../scripts/runner/apps";
import { ResultWidget, ResultWidgetProps } from "../widget/runner/ResultWidget";

export let runnerInstance: (Widget.Window|null) = null;
let onClickTimeout: (AstalIO.Time|undefined);

export function closeRunner(gtkWindow?: Widget.Window) {
    const window = gtkWindow ? gtkWindow : runnerInstance;

    window?.destroy();
    runnerInstance = null;
}

export function startRunnerDefault() {
    return Runner.RunnerWindow({
        entryPlaceHolder: "Start typing...",
        resultsPlaceholder: () => [
            new ResultWidget({
                icon: "utilities-terminal-symbolic",
                title: "Run shell commands",
                description: "Start typing with '!' prefix to run shell commands"
            } as ResultWidgetProps),
            new ResultWidget({
                icon: "application-x-executable-symbolic",
                title: "Run your applications",
                description: "Type the name of the application to search"
            } as ResultWidgetProps),
            new ResultWidget({
                icon: "applications-internet-symbolic",
                title: "Search the Web",
                description: "Start typing with '?' prefix to search the web"
            } as ResultWidgetProps)
        ]
    } as Runner.RunnerProps);
}

export namespace Runner {
    export type RunnerProps = {
        halign?: Gtk.Align;
        valign?: Gtk.Align;
        width?: number;
        height?: number;
        entryPlaceHolder?: string;
        resultsPlaceholder?: () => Array<Gtk.Widget>;
    };

    export const prefixes = new Map<string, (entry: string) => (ResultWidget|Array<ResultWidget>|null)>([
        [ "!", handleShell ],
        [ "?", handleWebSearch ],
    ]);

    export function RunnerWindow(props?: RunnerProps): (Widget.Window|null) {
        let subs: Array<() => void> = [];
        const entryText: Variable<string> = new Variable<string>("");
        let results: (Array<ResultWidget>|null) = null;
        let selectedResultIndex = 0;

        const searchEntry = new Widget.Entry({
            className: "search",
            onChanged: (entry) => entryText.set(entry.text),
            placeholderText: props?.entryPlaceHolder || "",
            onActivate: (_) => {
                const resultWidget = resultsList.get_selected_row()?.get_child();
                if(resultWidget instanceof ResultWidget) {
                    resultWidget.onClick();
                    _.isFocus = false;
                }
            },
            primary_icon_name: "system-search"
        } as Widget.EntryProps);

        const resultsList: Gtk.ListBox = new Gtk.ListBox({
            visible: true,
            expand: true
        } as Gtk.ListBox.ConstructorProps);

        subs.push(entryText().subscribe((text: string) => {
            const trimmedText = text.trim();
            const pluginResult: (ResultWidget|Array<ResultWidget>|null|undefined) = handlePrefix(
                trimmedText)?.(trimmedText.replace(trimmedText.charAt(0), ""));
            results = Boolean(pluginResult) ? 
                (!Array.isArray(pluginResult) ?
                    [ pluginResult! ]
                : pluginResult) 
            : null;

            if(resultsList.get_children().length > 0) {
                resultsList.get_children().map((listItem: Gtk.Widget) => {
                    resultsList.remove(listItem);
                    listItem.destroy();
                });
            }

            if(results && results.length > 0 && searchEntry.text.trim().length > 0) {
                results.map((resultWidget: ResultWidget) => {
                    resultsList.insert(resultWidget, -1);

                    const listBoxChild = resultsList.get_row_at_index(resultsList.get_children().length - 1)!;
                    const resWidget = listBoxChild.get_child();
                    if(listBoxChild && resWidget instanceof ResultWidget) {
                        resultsList.connect("row-activated", (_, row: Gtk.ListBoxRow) => {
                            const rWidget = row.get_child()!;
                            if(rWidget instanceof ResultWidget) {
                                if(!onClickTimeout) {
                                    rWidget.onClick();
                                    // Timeout, so it doesn't fire the executable a hundred times :skull:
                                    onClickTimeout = timeout(500, () => onClickTimeout = undefined);
                                }
                            }
                        });
                    }
                });
            } else {
                if(props?.resultsPlaceholder) {
                    const widgets = props.resultsPlaceholder();
                    resultsList.get_children().map((res) => 
                        resultsList.remove(res));

                    widgets.map((widget) => resultsList.insert(widget, -1));
                }
            }

            selectedResultIndex = 0;
            resultsList.select_row(resultsList.get_row_at_index(selectedResultIndex));
        }));

        if(!runnerInstance)
            runnerInstance = PopupWindow({
                namespace: "runner",
                halign: props?.halign || Gtk.Align.CENTER,
                valign: props?.valign || Gtk.Align.CENTER,
                widthRequest: props?.width || 750,
                heightRequest: props?.height || 450,
                onKeyPressEvent: (_, event: Gdk.Event) => {
                    const keyVal = event.get_keyval()[1];
                    if(!searchEntry.has_focus && keyVal !== Gdk.KEY_F5 
                       && keyVal !== Gdk.KEY_Down && keyVal !== Gdk.KEY_Up
                       && keyVal !== Gdk.KEY_KP_Enter && keyVal !== Gdk.KEY_ISO_Enter) {
                        searchEntry.grab_focus_without_selecting();
                    }


                    event.get_keyval()[1] === Gdk.KEY_F5 &&
                        updateApps();
                    
                },
                closeAction: (_) => closeRunner(_),
                onClose: () => subs.map(sub => sub()),
                child: new Widget.Box({
                    className: "runner main",
                    orientation: Gtk.Orientation.VERTICAL,
                    children: [
                        searchEntry,
                        new Widget.Scrollable({
                            className: "results-scrollable",
                            vscroll: Gtk.PolicyType.AUTOMATIC,
                            hscroll: Gtk.PolicyType.NEVER,
                            expand: true,
                            child: resultsList
                        })
                    ]
                } as Widget.BoxProps)
            } as PopupWindowProps);

        return runnerInstance;
    }

    export function handlePrefix(text: string): (((a: string) => (Array<ResultWidget>|ResultWidget|null)) | null) {
        const prefix = text.charAt(0);
        let result: (((a: string) => ResultWidget|Array<ResultWidget>|null)|null) = null;

        if(/([a-z]|[A-Z]|[0-9])/.test(prefix)) 
            result = handleApplications;

        [...prefixes.keys()].map((curPrefix: string) => {
            if(curPrefix === prefix) 
                result = prefixes.get(curPrefix)!;
        });
        
        return result;
    }
}
