import { Gdk, Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";

import AstalApps from "gi://AstalApps";
import AstalHyprland from "gi://AstalHyprland";


export const uwsmIsActive: boolean = await execAsync(
    "uwsm check is-active hyprland-uwsm.desktop"
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

/** handles running with uwsm if it's installed */
export function execApp(app: AstalApps.Application|string, dispatchExecArgs?: string) {
    const executable = (typeof app === "string") ? app 
        : app.executable.replace(/(%f|%F|%u|%U|%i|%c|%k)/g, "");

    AstalHyprland.get_default().dispatch("exec", 
        `${dispatchExecArgs ? `${dispatchExecArgs} ` : ""}${uwsmIsActive ? "uwsm app -- " : ""}${executable}`
    );
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
   
    const nameReverseDNS = appName.split('.');
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

    return (icon && lookupIcon(`${icon}-symbolic`)) ?
        `${icon}-symbolic`
    : undefined;
}
