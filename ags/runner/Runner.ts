import { AstalIO, GObject, timeout } from "astal";
import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { PopupWindow, PopupWindowProps } from "../widget/PopupWindow";
import { updateApps } from "../scripts/apps";
import { ResultWidget, ResultWidgetProps } from "../widget/runner/ResultWidget";
import { Windows } from "../windows";
import AstalHyprland from "gi://AstalHyprland";

export namespace Runner {
export type RunnerProps = {
    halign?: Gtk.Align;
    valign?: Gtk.Align;
    width?: number;
    height?: number;
    entryPlaceHolder?: string;
    initialText?: string;
    resultsLimit?: number;
    showResultsPlaceHolderOnStartup?: boolean;
};

export interface Plugin {
    /** prefix to call the plugin. if undefined, will be triggered like applications plugin */
    readonly prefix?: string;
    /** name of the plugin. e.g.: websearch, shell */
    readonly name?: string;
    /** ran on runner open */
    readonly init?: () => void;
    /** handle the user input to return results (does not include plugin's prefix) */
    readonly handle: (inputText: string) => (ResultWidget|Array<ResultWidget>|null|undefined);
    /** ran on runner close */
    readonly onClose?: () => void;
    /** hide other plugins when using this plugin */
    prioritize?: boolean;
}

export let instance: (Widget.Window|null) = null;
let gtkEntry: (Widget.Entry|null) = null;
const plugins = new Set<Runner.Plugin>();

export function close() { instance?.close(); }

export function regExMatch(search: string, item: (string|number)): boolean {
    search = search.replace(/[\\^$.*?()[\]{}|]/g, "\\$&");

    if(typeof item === "number")
        return new RegExp(`${search.split('').map(c => 
            `${c}`).join('')}`,
        "g").test(item.toString());

    return new RegExp(`${search.split('').map(c => 
        `${c}`).join('')}`,
    "gi").test(item);
}


export function addPlugin(plugin: Runner.Plugin, force?: boolean) {
    if(!force && plugin.prefix && plugins.has(plugin)) 
        throw new Error(`Runner plugin with prefix ${plugin.prefix} already exists`);

    plugins.delete(plugin);
    plugins.add(plugin);
}

export function getPlugins(): Array<Runner.Plugin> {
    return [...plugins.values()];
}

/** Removes a plugin from the runner plugins list
 * @returns true if plugin was removed or false if plugin wasn't found
  */
export function removePlugin(plugin: Plugin): boolean {
    return plugins.delete(plugin);
}

export function setEntryText(text: string): void {
    gtkEntry?.set_text(text);
    gtkEntry?.set_position(gtkEntry.textLength);

    gtkEntry?.grab_focus_without_selecting();
}

export function openDefault(initialText?: string) {
    return Runner.openRunner({
        entryPlaceHolder: "Start typing...",
        initialText,
        resultsLimit: 24
    } as Runner.RunnerProps,
    () => [
        new ResultWidget({
            icon: "application-x-executable-symbolic",
            title: "Use your applications",
            description: "Search for any app installed in your computer",
            closeOnClick: false,
            onClick: () => gtkEntry?.grab_focus()
        } as ResultWidgetProps),
        new ResultWidget({
            icon: "edit-paste-symbolic",
            title: "See your clipboard history",
            description: "Start your search with '>' to go through your clipboard history",
            closeOnClick: false,
            onClick: () => setEntryText('>')
        } as ResultWidgetProps),
        new ResultWidget({
            icon: "image-x-generic-symbolic",
            title: "Change your wallpaper",
            description: "Add '#' at the start to search through the wallpapers folder!",
            closeOnClick: false,
            onClick: () => setEntryText('#'),
        } as ResultWidgetProps),
        new ResultWidget({
            icon: "utilities-terminal-symbolic",
            title: "Run shell commands",
            description: "Add '!' before your command to run it (pro tip: add a second '!' to show command output)",
            closeOnClick: false,
            onClick: () => setEntryText('!!')
        } as ResultWidgetProps),
        new ResultWidget({
            icon: "media-playback-start-symbolic",
            title: "Control media",
            description: "Type ':' to control playing media",
            closeOnClick: false,
            onClick: () => setEntryText(':')
        } as ResultWidgetProps),
        new ResultWidget({
            icon: "applications-internet-symbolic",
            title: "Search the Web",
            description: "Start typing with '?' prefix to search the web",
            closeOnClick: false,
            onClick: () => setEntryText('?')
        } as ResultWidgetProps)
    ]);
}

export function openRunner(props: RunnerProps, placeholder?: () => Array<ResultWidget>): Widget.Window {
    let onClickTimeout: (AstalIO.Time|undefined);
    const connections: Map<GObject.Object, number> = new Map();

    props.width ??= 780;
    props.height ??= 420;

    gtkEntry = new Widget.Entry({
        className: "search",
        placeholderText: props?.entryPlaceHolder || "",
        onChanged: async (self) => {
            updateResultsList(self.text);
            resultsList.get_row_at_index(0) && 
                resultsList.select_row(resultsList.get_row_at_index(0));

            if(self.text.trim().length < 1 && !mainBox.get_style_context().has_class("empty-input")) {
                mainBox.get_style_context().add_class("empty-input");
                return;
            }

            mainBox.get_style_context().has_class("empty-input") &&
                mainBox.get_style_context().remove_class("empty-input");
        },
        onActivate: (entry) => {
            const resultWidget = resultsList.get_selected_row()?.get_child();
            if(resultWidget instanceof ResultWidget) {
                entry.isFocus = false;
                resultWidget.onClick();
                resultWidget.closeOnClick && Runner.close();
            }
        },
        primary_icon_name: "system-search"
    } as Widget.EntryProps);

    const mainBox = new Widget.Box({
        className: `runner main ${props.showResultsPlaceHolderOnStartup ? "empty" : ""}`,
        orientation: Gtk.Orientation.VERTICAL,
        hexpand: true,
        valign: Gtk.Align.START,
        children: [
            gtkEntry,
            new Widget.Scrollable({
                className: "results-scrollable",
                vscroll: Gtk.PolicyType.AUTOMATIC,
                hscroll: Gtk.PolicyType.NEVER,
                expand: true,
                visible: props.showResultsPlaceHolderOnStartup ?? false,
                propagateNaturalHeight: true,
                maxContentHeight: props.height,
                child: new Gtk.ListBox({
                    visible: true,
                    expand: true,
                } as Gtk.ListBox.ConstructorProps)
            })
        ]
    } as Widget.BoxProps);

    const scrollable = mainBox.get_children()[1] as Widget.Scrollable;
    const resultsList = scrollable.get_child() as Gtk.ListBox;

    if(props?.showResultsPlaceHolderOnStartup && placeholder) {
        const placeholderWidgets = placeholder();
        placeholderWidgets.map(widget =>
            resultsList.insert(widget, -1));
    }

    function cleanResults() {
        resultsList.get_children().map((listItem) => {
            resultsList.remove(listItem);
        });
    }

    function getPluginResults(input: string): Array<ResultWidget> {
        let calledPlugins: Array<Plugin> = getPlugins().filter((plugin) => 
            plugin.prefix ? (input.startsWith(plugin.prefix) ? true : false) : true
        ).sort((plugin) => plugin.prefix != null ? 0 : 1);

        for(const plugin of calledPlugins) {
            if(plugin.prioritize) {
                calledPlugins = [ plugin ];
                break;
            }
        }

        const results = calledPlugins.map(plugin => plugin.handle(
            plugin.prefix ? input.replace(plugin.prefix, "") : input)
        ).filter(value => value !== undefined && value !== null).flat(1);

        return props?.resultsLimit != null && 
            props.resultsLimit !== Infinity ? 
                results.splice(0, props.resultsLimit)
            : results;
    }

    function updateResultsList(entryText: string) {
        const widgets: Array<ResultWidget> = [];

        // Remove all previous results
        cleanResults();

        widgets.push(...getPluginResults(entryText))

        // Insert placeholder if there are no results
        if(placeholder && widgets.length === 0) 
            widgets.push(...placeholder());

        // Insert results inside GtkListBox
        widgets.map((resultWidget: ResultWidget) => {
            resultsList.insert(resultWidget, -1);

            const conns: Array<number> = [];

            conns.push(
                resultsList.connect("row-activated", (_, row: Gtk.ListBoxRow) => {
                    const rWidget = row.get_child();
                    if(rWidget instanceof ResultWidget) {
                        if(onClickTimeout) return;

                        // Timeout, so it doesn't fire the event a hundred times :skull:
                        onClickTimeout = timeout(500, () => onClickTimeout = undefined);
                        rWidget.onClick();
                        rWidget.closeOnClick && Runner.close();
                    }
                }),
                resultsList.connect("destroy", () => 
                    conns.forEach((id) => resultsList.disconnect(id))
                )
            );
        });

        widgets.length > 0 ? 
            (!scrollable.visible && scrollable.show())
        : scrollable.hide();
    }

    if(!instance)
        instance = Windows.createWindowForFocusedMonitor((mon: number): (Widget.Window) => PopupWindow({
            namespace: "runner",
            monitor: mon,
            widthRequest: props.width,
            heightRequest: props.height,
            marginTop: (AstalHyprland.get_default().get_monitor(mon)?.height / 2) - (props.height! / 2),
            exclusivity: Astal.Exclusivity.IGNORE,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.START,
            setup: () => {
                // Init plugins
                plugins.forEach(plugin => plugin.init && plugin.init());

                if(props?.initialText) 
                    Runner.setEntryText(props.initialText);
            },
            onKeyPressEvent: (_, event: Gdk.Event) => {
                const keyVal = event.get_keyval()[1];

                if(!gtkEntry!.has_focus && keyVal !== Gdk.KEY_F5 
                   && keyVal !== Gdk.KEY_Down && keyVal !== Gdk.KEY_Up
                   && keyVal !== Gdk.KEY_Return) {
                    gtkEntry!.grab_focus_without_selecting();
                    return;
                }

                event.get_keyval()[1] === Gdk.KEY_F5 &&
                    updateApps();
            },
            onDestroy: () => {
                connections.forEach((id, obj) => GObject.signal_handler_is_connected(obj, id) &&
                    obj.disconnect(id));

                gtkEntry = null;

                [...plugins.values()].forEach(plugin =>
                    plugin && plugin.onClose && plugin.onClose());

                instance = null;
            },
            child: mainBox
        } as PopupWindowProps))();

    return instance!;
}
}
