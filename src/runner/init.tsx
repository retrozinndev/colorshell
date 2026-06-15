import Runner from ".";
import { 
    PluginApps, 
    PluginClipboard, 
    PluginMedia, 
    PluginShell, 
    PluginWallpapers, 
    PluginWebSearch,
    PluginKill
} from "./plugins";

const plugins = [
    PluginApps, 
    PluginClipboard, 
    PluginMedia, 
    PluginShell, 
    PluginWallpapers, 
    PluginWebSearch,
    PluginKill
];

let initialized: boolean = false;
export function initRunner(): void {
    if(initialized)
        return;

    for(const plugin of plugins)
        Runner.addPlugin(plugin);

    initialized = true;
}
