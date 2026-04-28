import { Astal, Gdk, Gtk } from "ags/gtk4";
import { CCProps, createRoot } from "ags";
import { PopupWindow } from "../widget/PopupWindow";
import { updateApps } from "../modules/apps";
import { ResultWidget } from "./widgets/ResultWidget";
import { omitObjectKeys } from "../modules/utils";
import { getter, gtype, property, register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import AstalHyprland from "gi://AstalHyprland";
import Adw from "gi://Adw?version=1";


@register({ GTypeName: "ClshRunner" })
export class Runner extends PopupWindow {
    private static instance: Runner|null = null;
    private static plugins: Array<Runner.PluginConstructor> = [];
    public static get isOpen() { return this.instance !== null; }

    #results: Array<Runner.Result> = [];
    #container: Gtk.Box;
    #entry: Gtk.Entry;
    #scroll: Gtk.ScrolledWindow;
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

    @property(Array)
    placeholders: Array<Runner.Result> = [];

    @getter(Array<Runner.Result>)
    get results() { return [...this.#results]; }

    constructor(props: Partial<Runner.ConstructorProps> = {}) {
        super({
            namespace: "runner",
            cssName: "runner",
            marginTop: ((AstalHyprland.get_default().get_focused_monitor()?.height ?? 640) / 2) - (420 / 2),
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

        const connections: Map<GObject.Object, number|Array<number>> = new Map();
        this.#container = new Gtk.Box({
            hexpand: true,
            orientation: Gtk.Orientation.VERTICAL
        });
        this.#container.add_css_class("container");

        this.#entry = new Gtk.Entry({
            text: this.search,
            primaryIconName: "system-search-symbolic",
            primaryIconTooltipText: "Search in the Multifunctional Command Runner",
            secondaryIconName: "edit-clear-symbolic",
            secondaryIconTooltipText: "Clear"
        });
        connections.set(this.#entry, [
            this.#entry.connect("icon-release", (self, pos) => {
                if(pos === Gtk.EntryIconPosition.PRIMARY) {
                    self.notify("text"); // emit notify::text, so it will force-search again
                    return;
                }
              
                self.set_text("");
            }),
            this.#entry.connect("activate", (self) => {
                const row = this.#listbox.get_selected_row() as ResultWidget|null;
                if(!row) {
                    self.grab_focus();
                    return;
                }

                row.emit("clicked");
            })
        ]);

        this.bind_property("search", this.#entry, "text", GObject.BindingFlags.BIDIRECTIONAL);

        this.#listbox = Gtk.ListBox.new();
        this.#listbox.set_selection_mode(Gtk.SelectionMode.SINGLE);
        this.#listbox.set_activate_on_single_click(true);

        this.#scroll = new Gtk.ScrolledWindow({
            propagateNaturalHeight: false,
            hscrollbarPolicy: Gtk.PolicyType.NEVER,
            vscrollbarPolicy: Gtk.PolicyType.AUTOMATIC,
            hexpand: true,
            vexpand: true
        });

        connections.set(this, [
            this.connect("key-pressed", (_, key) => {
                switch(key) {
                    case Gdk.KEY_F5:
                        updateApps();
                        return;
                }
            }),
            this.connect("destroy", () => {
                connections.forEach((id, gobj) => Array.isArray(id) ?
                    id.forEach(num => gobj.disconnect(num))
                : gobj.disconnect(id));
            }),
            this.connect("notify::search", () => {
                this.update(this.search, this.maxResults).then(() => {
                    if(this.#results.length < 1)
                        return;

                    this.#listbox.select_row(this.#listbox.get_row_at_index(0));
                }).catch(console.error);
            })
        ]);

        // add widgets
        const bin = new Adw.Bin({
            widthRequest: props.widthRequest ?? 780,
            heightRequest: props.heightRequest ?? 420,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.START,
            vexpand: false,
            hexpand: true
        });
        this.set_child(bin);
        bin.set_child(this.#container);
        this.#container.append(this.#scroll);
        this.#container.prepend(this.#entry);
        this.#scroll.set_child(this.#listbox);

        // init plugins
        for(const construct of Runner.plugins) {
            this.#plugins.push(new construct());
        }
    }

    vfunc_close_request(): boolean {
        this.#plugins.forEach(p => p.onClose?.());
        Runner.instance = null;
        return false;
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
        this.instance.searchGrabFocus();
        this.instance.#entry.select_region(search.length, search.length);
    }

    /** close the existing runner instance, if there is one */
    public static close(): void {
        if(!this.isOpen)
            return;

        this.instance!.close();
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
    
    public static open(search?: string): Runner {
        if(this.instance)
            return this.instance;

        this.instance = createRoot((dispose) => 
            <Runner searchPlaceholder="Start typing..." search={search}
              showResultPlaceholders={false} maxResults={24}
              onClosed={() => dispose()}
              placeholders={[
                  {
                      icon: "application-x-executable-symbolic",
                      title: "Use your applications",
                      description: "Search for any app installed in your computer",
                      closeOnClick: false,
                      onClicked: () => this.instance?.searchGrabFocus()
                  },
                  {
                      icon: "edit-paste-symbolic",
                      title: "See your clipboard history",
                      description: "Start your search with '>' to go through your clipboard history",
                      closeOnClick: false,
                      onClicked: () => this.setSearch('>')
                  },
                  {
                      icon: "image-x-generic-symbolic",
                      title: "Change your wallpaper",
                      description: "Add '#' at the start to search through the wallpapers folder!",
                      closeOnClick: false,
                      onClicked: () => this.setSearch('#'),
                  },
                  {
                      icon: "utilities-terminal-symbolic",
                      title: "Run shell commands",
                      description: "Add '!' before your command to run it (tip: add another '!' to notify command output)",
                      closeOnClick: false,
                      onClicked: () => this.setSearch('!')
                  },
                  {
                      icon: "media-playback-start-symbolic",
                      title: "Control media",
                      description: "Type ':' to control playing media",
                      closeOnClick: false,
                      onClicked: () => this.setSearch(':')
                  },
                  {
                      icon: "applications-internet-symbolic",
                      title: "Search the Web",
                      description: "Start typing with '?' prefix to search the web",
                      closeOnClick: false,
                      onClicked: () => this.setSearch('?')
                  }
              ]}
            /> as Runner
        );
        this.instance.show();

        return this.instance;
    }

    protected async generateResults(input: string, limit?: number): Promise<Array<Runner.Result>> {
        let calledPlugins: Array<Runner.Plugin> = this.#plugins.filter((plugin) => 
            plugin.prefix ? (input.startsWith(plugin.prefix) ? true : false) : true
        ).sort((plugin) => plugin.prefix != null ? 0 : 1);

        let iconSet: boolean = false;
        const importantPlugin = calledPlugins.find(p => p.prioritize);
        if(importantPlugin && importantPlugin.iconName !== undefined) {
            this.#entry.primaryIconName = importantPlugin.iconName;
            iconSet = true;
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
        this.#results.splice(0, this.#results.length);

        try {
            this.#results = await this.generateResults(input, limit);
            this.notify("results");
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
        if(this.#results.length < 1) {
            for(const ph of this.placeholders) {
                this.#listbox.append(this.resultToWidget(ph));
            }

            return;
        }

        for(const result of this.#results) {
            const widget = this.resultToWidget(result);
            this.#listbox.append(widget);
        }
    }

    connect<S extends keyof Runner.SignalSignatures>(
        signal: S,
        callback: (self: Runner, ...params: Parameters<Runner.SignalSignatures[S]>) => ReturnType<Runner.SignalSignatures[S]>
    ): number {
        return GObject.Object.prototype.connect.call(this, signal, callback);
    }
}

export namespace Runner {
    export interface SignalSignatures extends PopupWindow.SignalSignatures {
        "notify::search": () => void;
        "notify::search-placeholder": () => void;
        "notify::show-result-placeholders": () => void;
        "notify::max-results": () => void;
        "notify::placeholders": () => void;
    }

    export interface ConstructorProps extends Astal.Window.ConstructorProps {
        searchPlaceholder: string;
        search: string;
        maxResults: number;
        showResultPlaceholders: boolean;
        placeholders: Array<Runner.Result>;
    };

    export type Result = CCProps<ResultWidget, ResultWidget.ConstructorProps>;
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
        * @default "system-search-symbolic" */
        iconName?: string;
    }

    export type PluginConstructor = new () => Runner.Plugin;
}
