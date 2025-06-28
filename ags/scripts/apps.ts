import { Astal } from "astal/gtk3";

import AstalApps from "gi://AstalApps";
import AstalHyprland from "gi://AstalHyprland";
import { execAsync } from "astal";


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

    if(Astal.Icon.lookup_icon(appName))
       return appName;

    if(Astal.Icon.lookup_icon(appName.toLowerCase()))
       return appName.toLowerCase();
   
    const nameReverseDNS = appName.split('.');
    if(Astal.Icon.lookup_icon(nameReverseDNS[nameReverseDNS.length - 1]))
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

    if(app.iconName && Astal.Icon.lookup_icon(app.iconName))
        return app.iconName;

    if(app.wmClass)
        return getIconByAppName(app.wmClass);

    return getIconByAppName(app.name);
}

export function getSymbolicIcon(app: (string|AstalApps.Application)): (string|undefined) {
    const icon = getAppIcon(app);

    return (icon && Astal.Icon.lookup_icon(`${icon}-symbolic`)) ?
        `${icon}-symbolic`
    : undefined;
}
