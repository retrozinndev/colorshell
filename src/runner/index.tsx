import { Astal, Gdk, Gtk } from "ags/gtk4";
import { CCProps, createRoot } from "ags";
import { getPopupWindowContainer, PopupWindow } from "../widget/PopupWindow";
import { updateApps } from "../modules/apps";
import { ResultWidget, ResultWidgetProps } from "./widgets/ResultWidget";
import { Windows } from "../window";
import { 
    PluginApps, 
    PluginClipboard, 
    PluginMedia, 
    PluginShell, 
    PluginWallpapers, 
    PluginWebSearch,
    PluginKill
} from "./plugins";

import AstalHyprland from "gi://AstalHyprland";
import GLib from "gi://GLib?version=2.0";
import { omitObjectKeys } from "../modules/utils";
import { gtype, property } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";


// TODO: rewrite ts
export class Runner extends Astal.Window {
    private static instance: Runner|null = null;
    private static plugins: Array<Runner.PluginConstructor> = [
        PluginApps,
        PluginClipboard, 
        PluginMedia, 
        PluginShell, 
        PluginWallpapers, 
        PluginWebSearch,
        PluginKill
    ];

    protected static ignoredKeys = [
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

    #timeout: GLib.Source|null = null;
    #entry: Gtk.Entry;
    #listbox: Gtk.ListBox;
    #plugins: Array<Runner.Plugin> = [];

    @property(gtype<string|null>(String))
    searchPlaceholder: string|null = null

    @property(Boolean)
    showResultPlaceholders: boolean = false;

    @property(Number)
    maxResults: number = 24;
    
    @property(String)
    search: string = "";

    @property(Array<Runner.Result>)
    placeholders: Array<Runner.Result> = [];


    constructor(props: Partial<Runner.ConstructorProps> = {}) {
        super({
            cssName: "runner",
            widthRequest: 780,
            heightRequest: 420,
            anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM,
            ...omitObjectKeys(props, [
                "searchPlaceholder",
                "search",
                "maxResults",
                "showResultPlaceholders",
                "placeholders"
            ])
        });

        if(props.searchPlaceholder !== undefined)
            this.searchPlaceholder = props.searchPlaceholder;

        if(props.search !== undefined)
            this.search = props.search;

        if(props.maxResults !== undefined)
            this.maxResults = props.maxResults;

        if(props.showResultPlaceholders !== undefined)
            this.showResultPlaceholders = props.showResultPlaceholders;

        if(props.placeholders !== undefined && props.placeholders.length > 0)
            props.placeholders.forEach(p => this.placeholders.push(p));

        this.#entry = Gtk.Entry.new();
        this.#entry.set_text(this.search);

        const connections: Map<GObject.Object, number> = new Map();
        const bind: GObject.Binding = this.bind_property(
            "search", this.#entry, "text", GObject.BindingFlags.BIDIRECTIONAL
        );

        this.#listbox = Gtk.ListBox.new();


        for(const construct of Runner.plugins) {
            this.#plugins.push(new construct());
        }

        connections.set(this, this.connect("destroy", () => {
            connections.forEach((id, gobj) => gobj.disconnect(id));
            bind.unbind();
        }));


    }

    /** grab focus to the search entry */
    public searchGrabFocus(): void {
        this.#entry.grab_focus_without_selecting();
    }
    
    /** set search string for runner instance if open */
    public static setSearch(search: string): void {
        if(!this.instance)
            return;

        this.instance.search = search;
    }
    
    public static addPlugin(plugin: Runner.PluginConstructor) {
        if(this.plugins.includes(plugin)) 
            return;

        this.plugins.push(plugin);
    }

    public static getPlugins(): Array<Runner.PluginConstructor> {
        return [...this.plugins];
    }

    public static regExMatch(search: string, item: (string|number)): boolean {
        search = search.replace(/[\\^$.*?()[\]{}|]/g, "\\$&");

        if(typeof item === "number")
            return new RegExp(`${search.split('').map(c => 
                `[${c}]`).join('')}`,
            "g").test(item.toString());

        return new RegExp(`${search.split('').map(c => 
            `${c}`).join('')}`,
        "gi").test(item);
    }
    
    public static open(search?: string) {
        return new Runner({
            searchPlaceholder: "Start typing...",
            search,
            showResultPlaceholders: false,
            maxResults: 24,
            placeholders: [
                {
                    icon: "application-x-executable-symbolic",
                    title: "Use your applications",
                    description: "Search for any app installed in your computer",
                    closeOnClick: false,
                    actionClick: () => this.instance?.searchGrabFocus()
                },
                {
                    icon: "edit-paste-symbolic",
                    title: "See your clipboard history",
                    description: "Start your search with '>' to go through your clipboard history",
                    closeOnClick: false,
                    actionClick: () => this.setSearch('>')
                },
                {
                    icon: "image-x-generic-symbolic",
                    title: "Change your wallpaper",
                    description: "Add '#' at the start to search through the wallpapers folder!",
                    closeOnClick: false,
                    actionClick: () => this.setSearch('#'),
                },
                {
                    icon: "utilities-terminal-symbolic",
                    title: "Run shell commands",
                    description: "Add '!' before your command to run it (tip: add another '!' to notify command output)",
                    closeOnClick: false,
                    actionClick: () => this.setSearch('!')
                },
                {
                    icon: "media-playback-start-symbolic",
                    title: "Control media",
                    description: "Type ':' to control playing media",
                    closeOnClick: false,
                    actionClick: () => this.setSearch(':')
                },
                {
                    icon: "applications-internet-symbolic",
                    title: "Search the Web",
                    description: "Start typing with '?' prefix to search the web",
                    closeOnClick: false,
                    actionClick: () => this.setSearch('?')
                }
            ]
        });
    }

    protected async generateResults(input: string, limit?: number): Promise<Array<Runner.Result>> {
        let calledPlugins: Array<Runner.Plugin> = this.#plugins.filter((plugin) => 
            plugin.prefix ? (input.startsWith(plugin.prefix) ? true : false) : true
        ).sort((plugin) => plugin.prefix != null ? 0 : 1);

        let iconSet: boolean = false;
        for(const plugin of calledPlugins) {
            if(plugin.prioritize) {
                calledPlugins = [ plugin ];
                if(plugin.iconName !== undefined) {
                    this.#entry.primaryIconName = plugin.iconName;
                    iconSet = true;
                }

                break;
            }
        }

        if(!iconSet)
            this.#entry.primaryIconName = "system-search-symbolic";


        let results: Array<Runner.Result> = [];
        function push(result: Runner.Result|null|undefined|void|Array<Runner.Result|null|undefined|void>) {
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

    protected resultToWidget(result: Runner.Result): ResultWidget {
        return createRoot(dispose =>
            <ResultWidget {...result} onDestroy={(self) => {
                result.onDestroy?.(self);
                dispose();
            }} /> as ResultWidget
        );
    }

    public async update(input: string, limit?: number) {
        this.#listbox.remove_all();

        let results: Array<Runner.Result>;
        try {
            results = await this.generateResults(input, limit);
        } catch(e) {
            console.error(`Couldn't get results because of an error: ${(e as Error).message}\n${(e as Error).stack}`);

            this.#listbox.prepend(
                new ResultWidget({
                    title: `Error: ${(e as Error).message}`,
                    description: "Try changing your search a little...",
                    icon: "window-close-symbolic"
                })
            );

            return;
        }

        // Insert placeholder if there are no results
        if(results.length < 1) {
            for(const ph of this.placeholders) {
                this.#listbox.append(this.resultToWidget(ph));
            }

            return;
        }

        for(const result of results) {
            const widget = this.resultToWidget(result);
            this.#listbox.append(widget);
        }
    }
}

export namespace Runner {
    export interface ConstructorProps extends Astal.Window.ConstructorProps {
        searchPlaceholder: string;
        search: string;
        maxResults: number;
        showResultPlaceholders: boolean;
        placeholders: Array<Runner.Result>;
    };

    export type Result = CCProps<ResultWidget, ResultWidgetProps>;
    export type PluginConstructor = new () => Runner.Plugin;

    export interface Plugin {
        /** prefix to call the plugin. if undefined, will be triggered like applications plugin */
        readonly prefix?: string;
        /** name of the plugin. e.g.: websearch, shell */
        readonly name: string;
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


export function openRunner(props: RunnerProps, placeholders?: Array<Result>): Astal.Window {
    props.width ??= 780;
    props.height ??= 420;

    let clickTimeout: GLib.Source|undefined;

    if(!instance)
        instance = Windows.forFocusedMonitor((mon) => 
            <PopupWindow namespace={"runner"} monitor={mon} widthRequest={props.width} 
              heightRequest={props.height} exclusivity={Astal.Exclusivity.IGNORE} halign={Gtk.Align.CENTER}
              marginTop={(AstalHyprland.get_default().get_monitor(mon)?.height / 2) - (props.height! / 2)}
              valign={Gtk.Align.START} hexpand orientation={Gtk.Orientation.VERTICAL}
              $={() => {
                  plugins.forEach(construct => {
                      const plugin = new construct();
                      pluginInstances.push(plugin);
                      plugin.init?.();
                  });

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
                  pluginInstances.splice(0, pluginInstances.length)
                    .forEach(plugin => plugin?.onClose?.());

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
