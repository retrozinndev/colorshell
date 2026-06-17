import { Gdk, Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import { isInstalled } from "./utils";
import AstalApps from "gi://AstalApps";
import Compositor from "../compositor";
import Hyprland from "../compositor/interface/hyprland";
import AstalHyprland from "gi://AstalHyprland?version=0.1";


export const uwsmIsActive: boolean = isInstalled("uwsm") && await execAsync(
    "uwsm check is-active"
).then(() => true).catch(() => false);
const astalApps: AstalApps.Apps = new AstalApps.Apps();

let appsList: Array<AstalApps.Application> = astalApps.get_list();

export function getApps(): Array<AstalApps.Application> {
    return appsList;
}

export function updateApps(): void {
    astalApps.reload();
    appsList = astalApps.get_list();
}

export function getAstalApps(): AstalApps.Apps {
    return astalApps;
}

/** execute apps and commands using Hyprland's exec dispatcher.
    supports desktop entries and usage of uwsm if it's active */
export function execApp(app: AstalApps.Application|string, dispatchExecArgs?: string) {
    const executable = (typeof app === "string") ? app 
        : app.executable.replace(/%[fFuUick]/g, "");

    const comp = Compositor.getDefault() as Hyprland.Hyprland;
    const cmd = `${uwsmIsActive ? "uwsm-app -- " : executable.endsWith(".desktop") ?
        "gio-launch "
    : ""}${executable}`;
    
    if(comp.configProvider === Hyprland.Hyprland.ConfigProvider.LUA) {
        AstalHyprland.get_default().dispatch("hl.dsp.exec_cmd", `("${cmd}")`);
        return;
    }

    AstalHyprland.get_default().dispatch("exec", cmd);
}

export function lookupIcon(name: string): boolean {
    return Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!)?.has_icon(name);
}

export function getAppsByName(appName: string): (Array<AstalApps.Application>|undefined) {
    let found: Array<AstalApps.Application> = [];

    getApps().map((app: AstalApps.Application) => {
        if(app.get_name().trim().toLowerCase() === appName.trim().toLowerCase()
          || (app?.wmClass && app.wmClass.trim().toLowerCase() === appName.trim().toLowerCase()))
            found.push(app);
    });

    return (found.length > 0 ? found : undefined);
}

export function getIconByAppName(appName: string): (string|undefined) {
    if(!appName) return undefined;

    if(lookupIcon(appName))
       return appName;

    if(lookupIcon(appName.toLowerCase()))
       return appName.toLowerCase();

    const nameNoSpecialChars = appName.toLowerCase().replace(/[!?:,~]/g, ""); // solution for cases like "osu!"
    if(lookupIcon(nameNoSpecialChars))
        return nameNoSpecialChars;
   
    const nameReverseDNS = appName.split('.');
    const lastItem = nameReverseDNS[nameReverseDNS.length - 1];
    const lastPretty = `${lastItem.charAt(0).toUpperCase()}${lastItem.substring(1, lastItem.length)}`;

    const uppercaseRDNS = nameReverseDNS.slice(0, nameReverseDNS.length - 1)
        .concat(lastPretty).join('.');

    if(lookupIcon(uppercaseRDNS))
        return uppercaseRDNS;

    if(lookupIcon(nameReverseDNS[nameReverseDNS.length - 1]))
       return nameReverseDNS[nameReverseDNS.length - 1];

    const found: (AstalApps.Application|undefined) = getAppsByName(appName)?.[0];
    if(Boolean(found))
        return found?.iconName;

    return undefined;
}

export function getAppIcon(app: (string|AstalApps.Application)): (string|undefined) {
    if(!app) return undefined;

    if(typeof app === "string")
        return getIconByAppName(app);

    if(app.iconName && lookupIcon(app.iconName))
        return app.iconName;

    if(app.wmClass)
        return getIconByAppName(app.wmClass);

    return getIconByAppName(app.name);
}

export function getSymbolicIcon(app: (string|AstalApps.Application)): (string|undefined) {
    const icon = getAppIcon(app);

    if(icon === undefined)
        return undefined;

    const commonSymbolic = `${icon}-symbolic`;
    if(lookupIcon(commonSymbolic))
        return commonSymbolic;

    const nameNoSpecialChars = `${icon.replace(/[!?:,~]/g, "")}-symbolic`;
    if(lookupIcon(nameNoSpecialChars))
        return nameNoSpecialChars;

    return (icon && lookupIcon(`${icon}-symbolic`)) ?
        `${icon}-symbolic`
    : undefined;
}
