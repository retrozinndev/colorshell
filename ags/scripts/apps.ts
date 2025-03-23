import { Astal } from "astal/gtk3";
import AstalApps from "gi://AstalApps";
import AstalHyprland from "gi://AstalHyprland";

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

export function cleanExec(app: AstalApps.Application): void {
    AstalHyprland.get_default().dispatch("exec", app.executable.replace(/(%f|%F|%u|%U|%i|%c|%k)/g, ""));
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

export function getAppIcon(appName: string): (string|undefined) {
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

    return "application-x-executable-symbolic";
}
