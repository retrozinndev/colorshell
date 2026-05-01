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
function init(): void {
    if(initialized)
        return;

    for(const plugin of plugins)
        Runner.addPlugin(plugin);

    initialized = true;
}

export function toggleRunner(search?: string): void {
    init();
    if(Runner.isOpen) {
        Runner.close();
        return;
    }

    Runner.open(search);
}
