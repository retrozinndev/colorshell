import { AstalIO, timeout, Variable } from "astal";
import { Gdk, Gtk, Widget } from "astal/gtk3";
import { PopupWindow, PopupWindowProps } from "../widget/PopupWindow";
import { updateApps } from "../scripts/apps";
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
        resultsPlaceholder?: () => Array<ResultWidget>;
    };

    const plugins = new Set<Runner.Plugin>([]);

    export interface Plugin {
        /** prefix to call the plugin. if undefined, will be triggered like applications plugin */
        readonly prefix?: string;
        /** name of the plugin. e.g.: websearch, shell */
        readonly name?: string;
        /** handle the user input to return results (does not contain prefix) */
        readonly handle: (inputText: string) => (ResultWidget|Array<ResultWidget>|null|undefined);
    }

    export function addPlugin(plugin: Runner.Plugin, force?: boolean) {
        if(!force && plugin.prefix && plugins.has(plugin)) 
            throw new Error(`Runner plugin with prefix ${plugin.prefix} already exists`);

        plugins.add(plugin);
    }

    export function getPlugins(): Array<Runner.Plugin> {
        return [...plugins.values()];
    }

    /** Removes a plugin from the runner plugin list
     * @returns true if plugin was removed or false if plugin wasn't found
      */
    export function removePlugin(plugin: Plugin): boolean {
        return plugins.delete(plugin);
    }

    export function RunnerWindow(props?: RunnerProps): (Widget.Window|null) {
        let subs: Array<() => void> = [];
        const entryText: Variable<string> = new Variable<string>("");

        const searchEntry = new Widget.Entry({
            className: "search",
            onChanged: (entry) => entryText.set(entry.text),
            placeholderText: props?.entryPlaceHolder || "",
            onActivate: (entry) => {
                const resultWidget = resultsList.get_selected_row()?.get_child();
                if(resultWidget instanceof ResultWidget) {
                    resultWidget.onClick();
                    entry.isFocus = false;
                }
            },
            primary_icon_name: "system-search"
        } as Widget.EntryProps);

        const resultsList: Gtk.ListBox = new Gtk.ListBox({
            visible: true,
            expand: true
        } as Gtk.ListBox.ConstructorProps);

        function updateResultsList(entryText: string) {
            const calledPlugins: Array<Plugin> = getPlugins().filter((plugin) => plugin.prefix && entryText.startsWith(plugin.prefix) ?
                plugin : null).concat(getPlugins().filter(plugin => plugin.prefix === undefined));

            const widgets: Array<ResultWidget> = calledPlugins.map(plugin => plugin.handle(
                plugin.prefix ? entryText.replace(plugin.prefix, "") : entryText
            )).filter(value => value !== undefined && value !== null).flat(1);
            
            // Remove all previous results
            resultsList.get_children().map((listItem: Gtk.Widget) => {
                resultsList.remove(listItem);
                listItem.destroy();
            });

            // Insert placeholder if somehow no results are found
            if((!entryText || !widgets || widgets.length === 0) && props?.resultsPlaceholder)
                widgets.push(...props.resultsPlaceholder());

            // Insert results inside GtkListBox
            widgets.map((resultWidget: ResultWidget) => {
                resultsList.insert(resultWidget, -1);

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
            });
        }

        subs.push(entryText().subscribe((text: string) => {
            updateResultsList(text.trim());
            resultsList.select_row(resultsList.get_row_at_index(0));
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
}
