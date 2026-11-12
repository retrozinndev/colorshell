import Fuse from "fuse.js";
import AstalApps from "gi://AstalApps";
import { getApps } from "./apps";

let appSearch: {
    apps: ReadonlyArray<AstalApps.Application>;
    fuse: Fuse<AstalApps.Application>;
}|undefined;

function getAppSearch(apps: ReadonlyArray<AstalApps.Application>): Fuse<AstalApps.Application> {
    const cached = appSearch;
    const listUnchanged = cached !== undefined
        && apps.length === cached.apps.length
        && apps.every((app, index) => app === cached.apps[index]);

    if(listUnchanged)
        return cached.fuse;

    const fuse = new Fuse(apps, {
        keys: [
            { name: "name", weight: 2, getFn: app => app.name },
            { name: "executable", weight: 0.5, getFn: app => app.executable },
            {
                name: "keywords",
                weight: 0.5,
                getFn: app => app.keywords ?? []
            }
        ],
        sortFn: (a, b) => a.score - b.score
            || apps[b.idx].frequency - apps[a.idx].frequency,
        threshold: 0.4
    });

    appSearch = { apps, fuse };
    return fuse;
}

export function searchApps(search: string, limit?: number): Array<AstalApps.Application> {
    const apps = getApps().get_list();
    const text = search.trim();

    if(text.length <= 1) {
        const sorted = [...apps].sort((a, b) => b.frequency - a.frequency);
        return limit !== undefined && limit > 0 && limit !== Infinity
            ? sorted.slice(0, limit)
            : sorted;
    }

    return getAppSearch(apps).search(text, {
        limit: limit !== undefined && limit > 0 ? limit : Infinity
    }).map(result => result.item);
}
