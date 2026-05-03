const Package = imports.package;


Package.init({
    name: "io.github.retrozinndev.colorshell",
    version: COLORSHELL_VERSION,
    prefix: "~/.local",
    datadir: "/share",
    libdir: "/lib"
});

Package.require({
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
