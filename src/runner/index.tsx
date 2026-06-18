import { Gdk, Gtk } from "ags/gtk4";
import { CCProps, createRoot } from "ags";
import { PopupWindow } from "../widget/PopupWindow";
import { updateApps } from "../modules/apps";
import ResultItem from "./widgets/ResultItem";
import { omitObjectKeys } from "../modules/utils";
import { getter, gtype, property, register } from "ags/gobject";
import { initRunner } from "./init";
import GObject from "gi://GObject?version=2.0";
import AstalHyprland from "gi://AstalHyprland";
import Windows from "../window";
import ResultsList from "./widgets/ResultsList";
import { generalConfig } from "../config";


export const RunnerWindow = Windows.forFocusedMonitor(() =>
    <Runner 
        searchOnStartup={generalConfig.getProperty("runner.search_on_open", "boolean")}
        ignoreEmptySearch={generalConfig.getProperty("runner.ignore_empty_search", "boolean")} 
        maxResults={generalConfig.bindProperty("runner.max_results", "number")}
        showResultPlaceholders={generalConfig.bindProperty("runner.show_tips", "boolean")}
    />);

@register({ GTypeName: "ClshRunner" })
class Runner extends PopupWindow {
    private static instance: Runner|null = null;
    private static plugins: Array<Runner.PluginConstructor> = [];
    public static get isOpen() { return this.instance !== null; }

    #results: Array<Runner.Result> = [];
    #container: Gtk.Box;
    #entry: Gtk.Entry;
    #list: ResultsList;
    #plugins: Array<Runner.Plugin> = [];

    @property(gtype<string|null>(String))
    searchPlaceholder: string|null = "Search anything...";

    @property(Boolean)
    showResultPlaceholders: boolean = false;

    @property(Number)
    maxResults: number = 24;
    
    @property(String)
    search: string = "";

    @property(Boolean)
    ignoreEmptySearch: boolean = true;

    @property(Array)
    placeholders: Array<Runner.Result> = [
        {
            icon: "application-x-executable-symbolic",
            title: "Use your applications",
            description: "Search for any app installed in your computer",
            closeOnClick: false,
            onClicked: () => Runner.searchGrabFocus()
        },
        {
            icon: "edit-paste-symbolic",
            title: "See your clipboard history",
            description: "Start your search with '>' to go through your clipboard history",
            closeOnClick: false,
            onClicked: () => Runner.setSearch('>')
        },
        {
            icon: "image-x-generic-symbolic",
            title: "Change your wallpaper",
            description: "Add '#' at the start to search through the wallpapers folder!",
            closeOnClick: false,
            onClicked: () => Runner.setSearch('#'),
        },
        {
            icon: "utilities-terminal-symbolic",
            title: "Run shell commands",
            description: "Add '!' before your command to run it (tip: add another '!' to notify command output)",
            closeOnClick: false,
            onClicked: () => Runner.setSearch('!')
        },
        {
            icon: "media-playback-start-symbolic",
            title: "Control media",
            description: "Type ':' to control playing media",
            closeOnClick: false,
            onClicked: () => Runner.setSearch(':')
        },
        {
            icon: "applications-internet-symbolic",
            title: "Search the Web",
            description: "Start typing with '?' prefix to search the web",
            closeOnClick: false,
            onClicked: () => Runner.setSearch('?')
        }
    ];

    @getter(Array<Runner.Result>)
    get results() { return [...this.#results]; }


    constructor(props: Partial<Runner.ConstructorProps> = {}) {
        super({
            namespace: "runner",
            cssName: "runner",
            widthRequest: 780,
            heightRequest: 460,
            ...omitObjectKeys(props, [
                "searchPlaceholder",
                "search",
                "maxResults",
                "searchOnStartup",
                "ignoreEmptySearch",
                "showResultPlaceholders",
                "placeholders"
            ])
        });

        initRunner();
        if(Runner.instance === null)
            Runner.instance = this;

        if(props.search !== undefined)
            this.search = props.search;

        if(props.maxResults !== undefined)
            this.maxResults = props.maxResults;

        if(props.showResultPlaceholders !== undefined)
            this.showResultPlaceholders = props.showResultPlaceholders;

        if(props.placeholders !== undefined && props.placeholders.length > 0)
            props.placeholders.forEach(p => this.placeholders.push(p));

        if(props.searchPlaceholder !== undefined)
            this.searchPlaceholder = props.searchPlaceholder;

        if(props.ignoreEmptySearch != null)
            this.ignoreEmptySearch = props.ignoreEmptySearch;

        const connections: Map<GObject.Object, number|Array<number>> = new Map();
        this.#container = new Gtk.Box({
            hexpand: true,
            valign: Gtk.Align.START,
            visible: true,
            orientation: Gtk.Orientation.VERTICAL
        });
        this.#container.add_css_class("container");

        this.#entry = new Gtk.Entry({
            text: this.search,
            placeholderText: this.searchPlaceholder,
            primaryIconName: "system-search-symbolic",
            primaryIconTooltipText: "Search in the Multifunctional Command Runner",
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
                const row = this.#list.getSelected();
                if(!row) {
                    self.grab_focus_without_selecting();
                    return;
                }

                row.emit("clicked");
            })
        ]);

        this.#list = new ResultsList({
            maxContentSize: this.heightRequest,
            visible: true
        });

        connections.set(this, [
            this.connect("key-pressed", (_, key) => {
                switch(key) {
                    case Gdk.KEY_F5:
                        updateApps();
                        return;

                    case Gdk.KEY_Up:
                        this.#list.selectPrevious();
                        return;

                    case Gdk.KEY_Down:
                        this.#list.selectNext();
                        return;
                }
            }),
            this.connect("show", (self) => {
                self.#entry.select_region(this.#entry.textLength, this.#entry.textLength);
            }),
            this.connect("destroy", () => {
                connections.forEach((id, gobj) => Array.isArray(id) ?
                    id.forEach(num => gobj.disconnect(num))
                : gobj.disconnect(id));
            }),
            this.connect("notify::search", () => {
                this.update(this.search, this.maxResults).then(() => {
                    if(this.#results.length < 1) {
                        this.#entry.secondaryIconName = "";
                        this.#list.unselect();
                        return;
                    }

                    this.#entry.secondaryIconName = "edit-clear-symbolic";
                    this.#list.select(0);
                }).catch(console.error);
            })
        ]);

        this.bind_property("search", this.#entry, "text", GObject.BindingFlags.BIDIRECTIONAL);
        this.bind_property("search-placeholder", this.#entry, "placeholder-text", GObject.BindingFlags.BIDIRECTIONAL);

	// calculate margin position
        const monitor = AstalHyprland.get_default().get_focused_monitor();
        const scale = monitor?.scale ?? 1;
        const screenHeight = (monitor?.height ?? 640) / scale;
        const marginTop = (screenHeight / 2) - (this.heightRequest / 2);

        // add widgets
        const box = <Gtk.Box widthRequest={this.widthRequest} vexpand={false}
          heightRequest={this.heightRequest} halign={Gtk.Align.CENTER}
          valign={Gtk.Align.START} hexpand css={`
              margin-top: ${marginTop}px;
          `}
        /> as Gtk.Box;

        this.set_child(box);
        box.append(this.#container);
        this.#container.append(this.#list);
        this.#container.prepend(this.#entry);

        // init plugins
        for(const construct of Runner.plugins) {
            const plugin = new construct();
            this.#plugins.push(plugin);

            const result = plugin.init?.();
            if(typeof result === "object" && (result as object) instanceof Promise)
                (result as Promise<any>).catch(console.error);
        }

        if(props.searchOnStartup)
            this.notify("search");
    }

    vfunc_close_request(): boolean {
        this.#plugins.forEach(p => p.onClose?.());
        this.#plugins.splice(0, this.#plugins.length);
        Runner.instance = null;
        return false;
    }

    /** request a scroll animation to the currently-selected result (if any) */
    public requestScroll(targetY?: number): void {
        this.#list.requestScroll(targetY);
    }

    /** grab focus to the search entry */
    public static searchGrabFocus(): void {
        if(!Runner.instance)
            return;

        Runner.instance.#entry.grab_focus_without_selecting();
    }
    
    /** set search string for runner instance if open */
    public static setSearch(search: string): void {
        if(!this.instance)
            return;

        this.instance.search = search;
        this.searchGrabFocus();
        this.instance.#entry.select_region(search.length, search.length);
    }

    /** open a default instance of the app runner */
    public static open(search?: string): Runner {
        if(this.instance)
            return this.instance;

        Windows.getDefault().open("runner");
        search !== undefined &&
            this.setSearch(search);

        return this.instance!;
    }

    /** close the existing runner instance, if there is one */
    public static close(): void {
        if(!this.isOpen)
            return;

        Windows.getDefault().close("runner");
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

    protected resultToWidget(result: Runner.Result): ResultItem {
        return createRoot(dispose =>
            <ResultItem {...result} onDestroy={(self) => {
                result.onDestroy?.(self);
                dispose();
            }} /> as ResultItem
        );
    }

    public async update(input: string, limit?: number) {
        this.#list.clear();
        this.#results.splice(0, this.#results.length);
        this.notify("results");

        if(input.trim() === "" && this.ignoreEmptySearch) {
            if(this.showResultPlaceholders) {
                for(const ph of this.placeholders) {
                    this.#list.append(this.resultToWidget(ph));
                }
            }

            return;
        }

        try {
            this.#results = await this.generateResults(input, limit);
            this.notify("results");
        } catch(e) {
            console.error("Couldn't get results because of an error:", e);

            this.#list.prepend(
                new ResultItem({
                    title: "Try changing your search a little...",
                    description: `Error: ${(e as Error).message || "unknown error"}`,
                    icon: "window-close-symbolic"
                })
            );

            return;
        }

        // Insert placeholder if there are no results
        if(this.#results.length < 1 && this.showResultPlaceholders) {
            for(const ph of this.placeholders) {
                this.#list.append(this.resultToWidget(ph));
            }

            return;
        }

        for(const result of this.#results) {
            const widget = this.resultToWidget(result);
            this.#list.append(widget);
        }
    }
}

namespace Runner {
    export interface SignalSignatures extends PopupWindow.SignalSignatures {
        "notify::search": () => void;
        "notify::search-placeholder": () => void;
        "notify::show-result-placeholders": () => void;
        "notify::max-results": () => void;
        "notify::placeholders": () => void;
    }

    export interface ConstructorProps extends PopupWindow.ConstructorProps {
        searchPlaceholder: string;
        search: string;
        maxResults: number;
        ignoreEmptySearch: boolean;
        searchOnStartup: boolean;
        showResultPlaceholders: boolean;
        placeholders: Array<Runner.Result>;
    };

    export type Result = CCProps<ResultItem, ResultItem.ConstructorProps>;
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

export default Runner;
