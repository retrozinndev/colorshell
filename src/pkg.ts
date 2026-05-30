import "./overrides"; // thanks Aylur!!
import I18n from "./i18n/intl";


pkg.init({
    name: "io.github.retrozinndev.Colorshell",
    version: VERSION,
    prefix: "~/.local",
    datadir: "/share",
    libdir: "/lib"
});

pkg.require({
    "Adw": "1",
    "Gly": "2",
    "GlyGtk4": "2",
    "Astal": "4.0",
    "AstalBattery": "0.1",
    "AstalApps": "0.1",
    "AstalBluetooth": "0.1",
    "AstalHyprland": "0.1",
    "AstalMpris": "0.1",
    "AstalNetwork": "0.1",
    "AstalNotifd": "0.1",
    "AstalTray": "0.1",
    "AstalWp": "0.1",
});
Object.assign(globalThis, {
    assert(...conditions: Array<any>): boolean {
        if(!conditions.every(v => Boolean(v)))
            throw new Error("Assertion: At least one of the conditions are falsy");

        return true;
    }
});
I18n.init();
