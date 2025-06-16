import { exec, GLib, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Windows } from "../../windows";
import { Wallpaper } from "../../scripts/wallpaper";
import { execApp } from "../../scripts/apps";


function LockButton(): Widget.Button {
    return new Widget.Button({
        image: new Widget.Icon({
            icon: "system-lock-screen-symbolic"
        } as Widget.IconProps),
        onClick: () => {
            Windows.close("control-center");
            execApp("hyprlock");
        }
    } as Widget.ButtonProps)
}

function ColorPickerButton(): Widget.Button {
    return new Widget.Button({
        image: new Widget.Icon({
            icon: "color-select-symbolic"
        } as Widget.IconProps),
        onClick: () => {
            Windows.close("control-center");
            execApp("sh $HOME/.config/hypr/scripts/color-picker.sh");
        }
    } as Widget.ButtonProps)
}

function ScreenshotButton(): Widget.Button {
    return new Widget.Button({
        image: new Widget.Icon({
            icon: "applets-screenshooter-symbolic"
        } as Widget.IconProps),
        onClick: () => {
            Windows.close("control-center");
            execApp(`sh ${GLib.get_user_config_dir()}/hypr/scripts/screenshot.sh`);
        }
    } as Widget.ButtonProps);
}

function SelectWallpaperButton(): Widget.Button {
    return new Widget.Button({
        image: new Widget.Icon({
            icon: "preferences-desktop-wallpaper-symbolic"
        } as Widget.IconProps),
        onClick: () => {
            Windows.close("control-center");
            Wallpaper.getDefault().pickWallpaper();
        }
    } as Widget.ButtonProps);
}

function LogoutButton(): Widget.Button {
    return new Widget.Button({
        image: new Widget.Icon({
            icon: "system-shutdown-symbolic"
        } as Widget.IconProps),
        onClick: () => {
            Windows.close("control-center");
            Windows.open("logout-menu");
        }
    } as Widget.ButtonProps);
}

export const QuickActions = () => {
    const uptime = new Variable<string>("Just turned on").poll(1000, 
        () => exec("uptime -p").replace(/^up /, "")); 

    return new Widget.Box({
        className: "quickactions",
        children: [
            new Widget.Box({
                orientation: Gtk.Orientation.VERTICAL,
                halign: Gtk.Align.START,
                hexpand: true,
                className: "left",
                children: [
                    new Widget.Label({
                        className: "hostname",
                        xalign: 0,
                        tooltipText: "Host name",
                        label: GLib.get_host_name()
                    } as Widget.LabelProps),
                    new Widget.Box({
                        children: [
                            new Widget.Icon({
                                icon: "hourglass-symbolic"
                            } as Widget.IconProps),
                            new Widget.Label({
                                className: "uptime",
                                xalign: 0,
                                tooltipText: "Uptime",
                                onDestroy: () => uptime.drop(),
                                label: uptime()
                            } as Widget.LabelProps)
                        ]
                    } as Widget.BoxProps)
                ]
            } as Widget.BoxProps),
            new Widget.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                className: "right button-row",
                halign: Gtk.Align.END,
                hexpand: true,
                children: [
                    LockButton(),
                    ColorPickerButton(),
                    ScreenshotButton(),
                    SelectWallpaperButton(),
                    LogoutButton()
                ]
            } as Widget.BoxProps)
        ]
    } as Widget.BoxProps);
}
