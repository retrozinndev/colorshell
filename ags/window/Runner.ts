import { Variable } from "astal";
import { Gdk, Gtk, Widget } from "astal/gtk3";
import { PopupWindow, PopupWindowProps } from "../widget/PopupWindow";
import { updateApps } from "../scripts/apps";
import { handleShell } from "../scripts/runner/shell";
import { handleWebSearch } from "../scripts/runner/websearch";
import { handleApplications } from "../scripts/runner/apps";
import { ResultWidget, ResultWidgetProps } from "../widget/runner/ResultWidget";

export let runnerInstance: (Widget.Window|null) = null;

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

            [
                new Widget.Box({
                    className: "not-found",
                    orientation: Gtk.Orientation.VERTICAL,
                    visible: entryText((text: string) => text.trim().length > 0),
                    expand: true,
                    children: [
                        new Widget.Icon({
                            icon: "software-update-urgent-symbolic"
                        } as Widget.IconProps),
                        new Widget.Label({
                            label: "Couldn't find any results with this search. Maybe try pressing F5 and searching again?",
                            truncate: false,
                            wrap: true
                        } as Widget.LabelProps)
                    ]
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "placeholder",
                    orientation: Gtk.Orientation.VERTICAL,
                    expand: true,
                    visible: Boolean(props?.resultsPlaceholder),
                    children: props?.resultsPlaceholder && 
                        props?.resultsPlaceholder()
                } as Widget.BoxProps)
            ];

            if(resultsList.get_children().length > 0) {
                resultsList.get_children().map((listItem: Gtk.Widget) => {
                    resultsList.remove(listItem);
                    listItem.destroy();
                });
            }

            if(results && results.length > 0)
                results.map((resultWidget: ResultWidget) => {
                    resultsList.insert(resultWidget, -1);
                });

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
                    event.get_keyval()[1] === Gdk.KEY_F5 &&
                        updateApps();

                    if(event.get_keyval()[1] === Gdk.KEY_Down) {
                        resultsList.get_children().length > 0 &&
                            resultsList.select_row(resultsList.get_row_at_index(
                                (selectedResultIndex + 1) > (resultsList.get_children().length - 1) ? 
                                    0 
                                : selectedResultIndex + 1
                            ));
                    }
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
