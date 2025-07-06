import { Astal, Gdk, Gtk } from "ags/gtk4";
import { timeout } from "ags/time";
import { PopupWindow } from "../widget/PopupWindow";
import { updateApps } from "../scripts/apps";
import { ResultWidget, ResultWidgetProps } from "../widget/runner/ResultWidget";
import { Windows } from "../windows";

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

export function openRunner(props: RunnerProps, placeholder?: () => Array<ResultWidget>): Astal.Window {
    let onClickTimeout: (AstalIO.Time|undefined);
    const connections: Map<GObject.Object, number> = new Map();

    props.width ??= 780;
    props.height ??= 420;

    gtkEntry = <Gtk.SearchEntry class={"search"} placeholderText={props.entryPlaceHolder ?? ""}
      onSearchChanged={async (self) => {
          updateResultsList(self.text);
          resultsList.get_row_at_index(0) && 
              resultsList.select_row(resultsList.get_row_at_index(0));

          if(self.text.trim().length < 1 && !mainBox.get_style_context().has_class("empty-input")) {
              mainBox.get_style_context().add_class("empty-input");
              return;
          }

          mainBox.get_style_context().has_class("empty-input") &&
              mainBox.get_style_context().remove_class("empty-input");
      }} onActivate={() => {
          const resultWidget = resultsList.get_selected_row()?.get_child();
          if(resultWidget instanceof ResultWidget) {
              resultWidget.onClick();
              resultWidget.closeOnClick && Runner.close();
          }
      }}
    /> as Gtk.SearchEntry;

    const mainBox = <Gtk.Box class={`runner main ${props.showResultsPlaceHolderOnStartup ? 
          "empty" : ""}`} orientation={Gtk.Orientation.VERTICAL} hexpand={true}
      valign={Gtk.Align.START}>
        {gtkEntry}
        <Gtk.ScrolledWindow class={"results-scrollable"} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          hscrollbarPolicy={Gtk.PolicyType.NEVER} hexpand={true} vexpand={true}
          visible={props.showResultsPlaceHolderOnStartup ?? false}
          propagateNaturalHeight={true} maxContentHeight={props.height}>

            <Gtk.ListBox hexpand={true} vexpand={true} />
        </Gtk.ScrolledWindow>
    </Gtk.Box> as Gtk.Box;

    const scrollable = mainBox.get_last_child() as Gtk.ScrolledWindow;
    const resultsList = scrollable.get_first_child() as Gtk.ListBox;

    if(props?.showResultsPlaceHolderOnStartup && placeholder) {
        const placeholderGtks = placeholder();
        placeholderGtks.map(widget =>
            resultsList.insert(widget, -1));
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
        resultsList.remove_all();

        widgets.push(...getPluginResults(entryText))

        // Insert placeholder if there are no results
        if(placeholder && widgets.length === 0) 
            widgets.push(...placeholder());

        // Insert results inside GtkListBox
        widgets.map((resultGtk: ResultWidget) => {
            resultsList.insert(resultGtk, -1);

            const conns: Array<number> = [];

            conns.push(
                resultsList.connect("row-activated", (_, row: Gtk.ListBoxRow) => {
                    const rGtk = row.get_child();
                    if(rGtk instanceof ResultWidget) {
                        if(onClickTimeout) return;

                        // Timeout, so it doesn't fire the event a hundred times :skull:
                        onClickTimeout = timeout(500, () => onClickTimeout = undefined);
                        rGtk.onClick();
                        rGtk.closeOnClick && Runner.close();
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
        instance = Windows.getDefault().createWindowForFocusedMonitor((mon: number) => <PopupWindow 
          namespace={"runner"} monitor={mon} widthRequest={props.width} heightRequest={props.height}
          marginTop={(AstalHyprland.get_default().get_monitor(mon)?.height / 2) - (props.height! / 2)}
          exclusivity={Astal.Exclusivity.IGNORE} halign={Gtk.Align.CENTER} valign={Gtk.Align.START}
          $={() => {
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
          }} onDestroy={() => {
              connections.forEach((id, obj) => GObject.signal_handler_is_connected(obj, id) &&
                  obj.disconnect(id));

              gtkEntry = null;

              [...plugins.values()].forEach(plugin =>
                  plugin && plugin.onClose && plugin.onClose());

              instance = null;
          }}>
            {mainBox}
        </PopupWindow> as Astal.Window)();

    return instance!;
}
}
