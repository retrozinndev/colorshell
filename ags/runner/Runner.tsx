import { Astal, Gdk, Gtk } from "ags/gtk4";
import { PopupWindow } from "../widget/PopupWindow";
import { updateApps } from "../scripts/apps";
import { ResultWidget, ResultWidgetProps } from "./widgets/ResultWidget";
import { Windows } from "../windows";
import { createState, For } from "ags";
import { timeout } from "ags/time";

import GObject from "ags/gobject";
import AstalHyprland from "gi://AstalHyprland";
import AstalIO from "gi://AstalIO";


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

type Result = ResultWidgetProps;

export interface Plugin {
    /** prefix to call the plugin. if undefined, will be triggered like applications plugin */
    readonly prefix?: string;
    /** name of the plugin. e.g.: websearch, shell */
    readonly name?: string;
    /** runs when runner opens */
    readonly init?: () => void;
    /** handle the user input to return results (does not include plugin's prefix) */
    readonly handle: (inputText: string) => (Result|Array<Result>|null|undefined);
    /** runs when runner closes */
    readonly onClose?: () => void;
    /** prioritize this plugin's results over other results.
    * (hides other results that aren't from this plugin on list) */
    prioritize?: boolean;
}

export let instance: (Astal.Window|null) = null;
let gtkEntry: (Gtk.SearchEntry|null) = null;
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
    gtkEntry?.set_position(gtkEntry.text.length);

    gtkEntry?.grab_focus();
}

export function openDefault(initialText?: string) {
    return Runner.openRunner({
        entryPlaceHolder: "Start typing...",
        initialText,
        resultsLimit: 24
    } as Runner.RunnerProps, [
        {
            icon: "application-x-executable-symbolic",
            title: "Use your applications",
            description: "Search for any app installed in your computer",
            closeOnClick: false,
            actionClick: () => gtkEntry?.grab_focus()
        },
        {
            icon: "edit-paste-symbolic",
            title: "See your clipboard history",
            description: "Start your search with '>' to go through your clipboard history",
            closeOnClick: false,
            actionClick: () => setEntryText('>')
        },
        {
            icon: "image-x-generic-symbolic",
            title: "Change your wallpaper",
            description: "Add '#' at the start to search through the wallpapers folder!",
            closeOnClick: false,
            actionClick: () => setEntryText('#'),
        },
        {
            icon: "utilities-terminal-symbolic",
            title: "Run shell commands",
            description: "Add '!' before your command to run it (pro tip: add a second '!' to show command output)",
            closeOnClick: false,
            actionClick: () => setEntryText('!!')
        },
        {
            icon: "media-playback-start-symbolic",
            title: "Control media",
            description: "Type ':' to control playing media",
            closeOnClick: false,
            actionClick: () => setEntryText(':')
        },
        {
            icon: "applications-internet-symbolic",
            title: "Search the Web",
            description: "Start typing with '?' prefix to search the web",
            closeOnClick: false,
            actionClick: () => setEntryText('?')
        }
    ]);
}

export function openRunner(props: RunnerProps, placeholder?: Array<Result>): Astal.Window {
    props.width ??= 780;
    props.height ??= 420;

    const connections: Map<GObject.Object, number> = new Map();
    const [results, setResults] = createState([] as Array<Result>);
    let clickTimeout: AstalIO.Time|undefined;

    function getPluginResults(input: string): Array<Result> {
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

    function updateResultsList(input: string) {
        const newResults: Array<Result> = [];

        // Insert placeholder if there are no results
        if(placeholder && results.get().length === 0) 
            newResults.push(...placeholder);

        getPluginResults(input).forEach((result) => {
            newResults.unshift(result);
        });

        setResults(newResults);
    }

    if(!instance)
        instance = Windows.getDefault().createWindowForFocusedMonitor((mon: number) => 
            <PopupWindow namespace={"runner"} monitor={mon} widthRequest={props.width} 
              heightRequest={props.height} exclusivity={Astal.Exclusivity.IGNORE} halign={Gtk.Align.CENTER}
              marginTop={(AstalHyprland.get_default().get_monitor(mon)?.height / 2) - (props.height! / 2)}
              valign={Gtk.Align.START} $={() => {
                  plugins.forEach(plugin => 
                      plugin.init?.());

                  props.initialText && 
                      Runner.setEntryText(props.initialText);
              }} actionKeyPressed={(_, keyval) => {
                  if(!gtkEntry!.has_focus && keyval !== Gdk.KEY_F5 
                       && keyval !== Gdk.KEY_Down && keyval !== Gdk.KEY_Up
                       && keyval !== Gdk.KEY_Return) {
                        gtkEntry!.grab_focus();
                        return;
                    }

                    keyval === Gdk.KEY_F5 &&
                        updateApps();
              }} onCloseRequest={() => {
                  connections.forEach((id, obj) => GObject.signal_handler_is_connected(obj, id) &&
                      obj.disconnect(id));

                  gtkEntry = null;

                  [...plugins.values()].forEach(plugin => plugin?.onClose?.());

                  instance = null;
              }}>
                <Gtk.Box class={`runner main ${props.showResultsPlaceHolderOnStartup ? 
                      "empty" : ""}`} orientation={Gtk.Orientation.VERTICAL} hexpand
                  valign={Gtk.Align.START} visible>

                    <Gtk.SearchEntry class={"search"} placeholderText={props.entryPlaceHolder ?? ""}
                      $={(self) => gtkEntry = self}
                      onSearchChanged={(self) => {
                          updateResultsList(self.text);
                          const listbox = self.parent.get_last_child()?.get_first_child()?.get_first_child() as Gtk.ListBox;

                          listbox.get_row_at_index(0) && 
                              listbox.select_row(listbox.get_row_at_index(0));
                      }} onActivate={(self) => {
                          const listbox = self.parent.get_last_child()?.get_first_child()?.get_first_child() as Gtk.ListBox;
                          const resultWidget = listbox.get_selected_row()?.get_child();

                          if(resultWidget instanceof ResultWidget) {
                              resultWidget.actionClick();
                              resultWidget.closeOnClick && Runner.close();
                          }
                      }}
                    />
                    <Gtk.ScrolledWindow class={"results-scrollable"} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                      hscrollbarPolicy={Gtk.PolicyType.NEVER} hexpand vexpand propagateNaturalHeight
                      visible={props.showResultsPlaceHolderOnStartup ?? false} 
                      maxContentHeight={props.height}>

                        <Gtk.ListBox hexpand vexpand visible onRowActivated={(_, row) => {
                            if(row instanceof ResultWidget && !clickTimeout) {
                                clickTimeout = timeout(250, () => clickTimeout = undefined);
                                row.actionClick?.();
                            }
                        }}>
                            <For each={results}>
                                {(res: Result) => <ResultWidget {...res} visible />}
                            </For>
                        </Gtk.ListBox>
                    </Gtk.ScrolledWindow>
                </Gtk.Box>
            </PopupWindow> as Astal.Window
        )();

    return instance!;
}
}
