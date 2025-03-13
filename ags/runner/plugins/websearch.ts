import AstalHyprland from "gi://AstalHyprland";
import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";
import { Runner } from "../Runner";

const searchEngines = {
    duckduckgo: "https://duckduckgo.com/?q=",
    google: "https://google.com/search?q=",
    yahoo: "https://search.yahoo.com/search?p="
};

let engine: string = searchEngines.google;

export const PluginWebSearch = {
    prefix: '?',
    name: "Web Search",

    handle: (search: string): ResultWidget => {
        return new ResultWidget({
            icon: "system-search-symbolic",
            title: search || "Type your search...",
            description: `Search the Web`,
            onClick: () => AstalHyprland.get_default().dispatch(
                "exec", 
                `xdg-open \"${engine + search}\"`
            )
        } as ResultWidgetProps);
    }
} as Runner.Plugin;
