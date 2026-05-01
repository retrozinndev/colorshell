import Runner from "..";
import { execApp } from "../../modules/apps";


export class PluginWebSearch implements Runner.Plugin {
    protected static searchEngines = {
        duckduckgo: "https://duckduckgo.com/?q=",
        google: "https://google.com/search?q=",
        yahoo: "https://search.yahoo.com/search?p="
    };

    #engine: string = PluginWebSearch.searchEngines.google;

    prefix = '?';
    name = "Web Search";
    prioritize = true;


    handle(search: string) {
        return {
            icon: "system-search-symbolic",
            title: search || "Type your search...",
            description: `Search the Web`,
            onClicked: () => execApp(`xdg-open \"${this.#engine + search}\"`)
        } satisfies Runner.Result;
    }
}
