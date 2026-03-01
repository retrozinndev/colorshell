import { Astal, Gdk, Gtk } from "ags/gtk4";
import { CCProps, createRoot } from "ags";
import { getPopupWindowContainer, PopupWindow } from "../widget/PopupWindow";
import { updateApps } from "../modules/apps";
import { ResultWidget, ResultWidgetProps } from "./widgets/ResultWidget";
import { Windows } from "../windows";

import AstalHyprland from "gi://AstalHyprland";
import GLib from "gi://GLib?version=2.0";


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

export type Result = CCProps<ResultWidget, ResultWidgetProps>;

export interface Plugin {
    /** prefix to call the plugin. if undefined, will be triggered like applications plugin */
    readonly prefix?: string;
    /** name of the plugin. e.g.: websearch, shell */
    readonly name?: string;
    /** runs when runner opens */
    readonly init?: () => void;
    /** handle the user input to return results (does not include plugin's prefix) */
    readonly handle: (inputText: string, limit?: number) => Promise<Result|Array<Result>|null|undefined>|Result|Array<Result>|null|undefined;
    /** runs when runner closes */
    readonly onClose?: () => void;
    /** prioritize this plugin's results over other results.
    * (hides other results that aren't from this plugin on list) */
    prioritize?: boolean;
    /** show a specific icon when the plugin is prioritized/only 
    * has results from this plugin 
    * @todo actually implement the plugin icon feature
    * @default "system-search-symbolic" */
    iconName?: string;
}

export let instance: (Astal.Window|null) = null;

let gtkEntry: (Gtk.Entry|null) = null;
const plugins = new Set<Runner.Plugin>();
const ignoredKeys = [
    Gdk.KEY_space,
    Gdk.KEY_Shift_L,
    Gdk.KEY_Shift_R,
    Gdk.KEY_Shift_Lock,
    Gdk.KEY_Return,
    Gdk.KEY_Tab,
    Gdk.KEY_Control_L,
    Gdk.KEY_Control_R,
    Gdk.KEY_Alt_L,
    Gdk.KEY_Alt_R,
    Gdk.KEY_Option,
    Gdk.KEY_Super_L,
    Gdk.KEY_Super_R,,
    Gdk.KEY_F5,
    Gdk.KEY_Up,
    Gdk.KEY_Down,
    Gdk.KEY_Left,
    Gdk.KEY_Right
];


export function close() { instance?.close(); }
export function regExMatch(search: string, item: (string|number)): boolean {
    search = search.replace(/[\\^$.*?()[\]{}|]/g, "\\$&");

    if(typeof item === "number")
        return new RegExp(`${search.split('').map(c => 
            `[${c}]`).join('')}`,
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
    if(!gtkEntry) return;

    gtkEntry.set_text(text);
    gtkEntry.set_position(gtkEntry.text.length);
    gtkEntry.grab_focus_without_selecting();
}

export function openDefault(initialText?: string) {
    return Runner.openRunner({
        entryPlaceHolder: "Start typing...",
        initialText,
        showResultsPlaceHolderOnStartup: false,
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
            description: "Add '!' before your command to run it (tip: add another '!' to notify command output)",
            closeOnClick: false,
            actionClick: () => setEntryText('!')
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

async function getPluginResults(input: string, limit?: number): Promise<Array<Result>> {
    let calledPlugins: Array<Plugin> = getPlugins().filter((plugin) => 
        plugin.prefix ? (input.startsWith(plugin.prefix) ? true : false) : true
    ).sort((plugin) => plugin.prefix != null ? 0 : 1);

    for(const plugin of calledPlugins) {
        if(plugin.prioritize) {
            calledPlugins = [ plugin ];
            plugin.iconName !== undefined &&
                gtkEntry
            break;
        }
    }

    let results: Array<Result> = [];
    function push(result: Result|null|undefined|void|Array<Result|null|undefined|void>) {
        if(Array.isArray(result)) {
            results.push(...result.filter(r => r != null));
            return;
        }

        result && results.push(result);
    }

    for(const plugin of calledPlugins) {
        const res = plugin.handle(plugin.prefix ? 
            input.replace(plugin.prefix, "")
        : input, limit);

        res instanceof Promise ?
            await res.then(push)
        : push(res);
    }

    return limit !== undefined && limit > 0 && limit !== Infinity ? 
        results.splice(0, limit)
    : results;
}

async function updateResultsList(listbox: Gtk.ListBox, input: string, limit?: number, placeholders?: Array<Result>) {
    const newResults: Array<Result> = [],
        scrolledWindow = listbox.parent.parent as Gtk.ScrolledWindow;

    const results = await getPluginResults(input, limit).catch((e: Error) => {
        console.error(`Couldn't get results because of an error: ${e.message}\n${e.stack}`);

        listbox.insert(
            <ResultWidget title={`Error: ${e.message}`} description={"Try changing your search a little..."}
              icon={"window-close-symbolic"}
              actionClick={() => gtkEntry?.select_region(0, gtkEntry?.text.length - 1)}
            /> as ResultWidget,
        -1);

        return [] satisfies Array<Result>;
    });

    listbox.remove_all();

    results.forEach((result) => {
        listbox.insert(createRoot(dispose => 
            <ResultWidget {...result} onDestroy={(self) => {
                result.onDestroy?.(self);
                dispose();
            }}
            /> as ResultWidget
        ), -1);
        newResults.push(result);
    });

    // Insert placeholder if there are no results
    if(placeholders && newResults.length < 1) 
        placeholders.forEach(phdlr => listbox.insert(
          <ResultWidget {...phdlr} /> as ResultWidget, -1
        ));


    newResults.length > 0 ?
        (!scrolledWindow.visible && scrolledWindow.show())
    : scrolledWindow.hide();
}

function selectPreviousItem(listbox: Gtk.ListBox) {
    const selectedRow = listbox.get_selected_row();
    const prevRow = selectedRow?.get_prev_sibling();

    if(!prevRow || selectedRow === listbox.get_first_child()) 
        return;

    const viewport = listbox.parent as Gtk.Viewport;
    const vadjustment = (viewport.parent as Gtk.ScrolledWindow).get_vadjustment();
    const [, , prevRowY] = prevRow.translate_coordinates(viewport, 
        prevRow.get_allocation().x, prevRow.get_allocation().y);

    listbox.select_row(prevRow as Gtk.ListBoxRow);
    
    // emit ResultWidget ::selected / ::unselected
    (selectedRow?.get_child() as ResultWidget).emit("unselected");
    ((prevRow as Gtk.ListBoxRow|null)?.get_child() as ResultWidget).emit("selected");

    if(prevRowY < vadjustment.get_value()) 
        vadjustment.set_value(prevRowY);
}

function selectNextItem(listbox: Gtk.ListBox) {
    const selectedRow = listbox.get_selected_row();
    const nextRow = selectedRow?.get_next_sibling();

    if(!nextRow || selectedRow === listbox.get_last_child()) 
        return;

    const viewport = listbox.parent as Gtk.Viewport;
    const vadjustment = (viewport.parent as Gtk.ScrolledWindow).get_vadjustment();
    const nextRowVAllocation = (nextRow.get_allocation().y + nextRow.get_allocation().height);

    listbox.select_row(nextRow as Gtk.ListBoxRow);

    // emit ResultWidget ::selected / ::unselected
    (selectedRow?.get_child() as ResultWidget).emit("unselected");
    ((nextRow as Gtk.ListBoxRow|null)?.get_child() as ResultWidget).emit("selected");

    if(nextRowVAllocation > viewport.get_allocation().height) 
        vadjustment.set_value(nextRow.get_allocation().y - viewport.get_allocation().height + nextRow.get_allocation().height);
}

export function openRunner(props: RunnerProps, placeholders?: Array<Result>): Astal.Window {
    props.width ??= 780;
    props.height ??= 420;

    let clickTimeout: GLib.Source|undefined;

    if(!instance)
        instance = Windows.getDefault().createWindowForFocusedMonitor((mon, root) => 
            <PopupWindow namespace={"runner"} monitor={mon} widthRequest={props.width} 
              heightRequest={props.height} exclusivity={Astal.Exclusivity.IGNORE} halign={Gtk.Align.CENTER}
              marginTop={(AstalHyprland.get_default().get_monitor(mon)?.height / 2) - (props.height! / 2)}
              valign={Gtk.Align.START} hexpand orientation={Gtk.Orientation.VERTICAL}
              $={() => {
                  plugins.forEach(plugin => 
                      plugin.init?.());

                  props.initialText && 
                      Runner.setEntryText(props.initialText);
              }} actionKeyPressed={(self, keyval) => {
                    const listbox = ((getPopupWindowContainer(self).get_last_child() as Gtk.ScrolledWindow)
                      .get_child() as Gtk.Viewport).get_child() as Gtk.ListBox;

                    switch(keyval) {
                        case Gdk.KEY_F5:
                            updateApps();
                            return;

                        case Gdk.KEY_Left:
                        case Gdk.KEY_Up:
                            selectPreviousItem(listbox);
                            gtkEntry?.grab_focus();
                            return;

                        case Gdk.KEY_Right:
                        case Gdk.KEY_Down:
                            selectNextItem(listbox);
                            gtkEntry?.grab_focus();
                            return;
                    }

                    for(const key of ignoredKeys) {
                        if(keyval === key)
                            return;
                    }

                    if(!gtkEntry?.hasFocus) {
                        gtkEntry?.grab_focus();
                        listbox.grab_focus();
                    }
              }} actionClosed={() => {
                  [...plugins.values()].forEach(plugin => plugin?.onClose?.());
                  root.dispose();

                  instance = null;
                  gtkEntry = null;
              }}>
                <Gtk.Entry class={"search"} placeholderText={props.entryPlaceHolder ?? ""}
                  $={(self) => gtkEntry = self} onNotifyText={(self) => {
                      const listbox = ((self.get_next_sibling()! as Gtk.ScrolledWindow)
                        .get_child() as Gtk.Viewport).get_child() as Gtk.ListBox;
                      updateResultsList(listbox, self.text, props.resultsLimit, placeholders).then(() => {
                          const firstResult = listbox.get_row_at_index(0);
                          if(firstResult) {
                              listbox.select_row(firstResult);
                              (firstResult.get_child() as ResultWidget).emit("selected");
                          };
                      });
                  }} primaryIconName={"system-search-symbolic"}
                  primaryIconTooltipText={"Search"}
                  secondaryIconName={"edit-clear-symbolic"}
                  secondaryIconTooltipText={"Clear search"}
                  onIconRelease={(self, iconPos) => {
                      if(iconPos === Gtk.EntryIconPosition.PRIMARY) {
                          self.notify("text"); // emit notify::text, so it will force-search again
                          return;
                      }
                        
                      self.set_text("");
                  }} onActivate={(self) => {
                      const listbox = ((self.get_next_sibling() as Gtk.ScrolledWindow)
                        .get_child() as Gtk.Viewport).get_child() as Gtk.ListBox;
                      const resultWidget = listbox.get_selected_row()?.get_child();

                      if(resultWidget instanceof ResultWidget && !clickTimeout) {
                          clickTimeout = setTimeout(() => clickTimeout = undefined, 250);
                          resultWidget.actionClick();
                          resultWidget.closeOnClick && Runner.close();
                      }

                  }}
                />
                <Gtk.ScrolledWindow class={"results-scrollable"} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                  hscrollbarPolicy={Gtk.PolicyType.NEVER} hexpand vexpand propagateNaturalHeight visible={false}
                  maxContentHeight={props.height} focusable={false}>

                    <Gtk.ListBox hexpand activateOnSingleClick selectionMode={Gtk.SelectionMode.SINGLE} 
                      onRowSelected={(_, row) => {
                          if(row instanceof ResultWidget) {
                              row.grab_focus();
                              gtkEntry?.grab_focus_without_selecting();
                          }
                      }} onRowActivated={(_, row) => {
                          const child = row.get_child()!;

                          if(child instanceof ResultWidget && !clickTimeout) {
                              clickTimeout = setTimeout(() => clickTimeout = undefined, 250);
                              child.actionClick?.();
                              child.closeOnClick && Runner.close();
                          }
                      }}
                    />
                </Gtk.ScrolledWindow>
            </PopupWindow> as Astal.Window
        )();

    return instance!;
}
}
