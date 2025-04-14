import { exec, execAsync, GLib, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalHyprland from "gi://AstalHyprland";
import { Windows } from "../../windows";

const uptime = new Variable<string>("Just turned on").poll(1000, 
    () => exec("uptime -p").replace(/^up /, "")
);

function LockButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰌾",
        onClick: () => {
            Windows.close("control-center");
            AstalHyprland.get_default().dispatch("exec", "hyprlock");
        }
    } as Widget.ButtonProps)
}

function ColorPickerButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰴱",
        onClick: () => AstalHyprland.get_default().dispatch(
            "exec", 
            "sh $HOME/.config/hypr/scripts/color-picker.sh"
        )
    } as Widget.ButtonProps)
}

function ScreenshotButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰹑",
        onClick: () => execAsync(
            `hyprshot -m region -o ${GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES) ?
                    `${GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES)}/Screenshots`
                : `${GLib.get_home_dir()}/Screenshots` 
            }`)
    } as Widget.ButtonProps);
}

function SelectWallpaperButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰸉",
        onClick: () => execAsync(
            `sh ${GLib.get_user_config_dir() || `${GLib.get_home_dir()}/.config`
            }/hypr/scripts/change-wallpaper.sh`
        )
    } as Widget.ButtonProps);
}

function LogoutButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰗽",
        onClick: () => Windows.open("logout-menu")
    } as Widget.ButtonProps);
}

export const QuickActions = () => new Widget.Box({
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
                    label: GLib.get_host_name()
                } as Widget.LabelProps),
                new Widget.Label({
                    className: "uptime",
                    xalign: 0,
                    label: uptime().as((uptime: string) => `󱡢  ${uptime}`)
                } as Widget.LabelProps)
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
