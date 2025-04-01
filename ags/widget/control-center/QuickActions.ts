import { execAsync, Process, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalHyprland from "gi://AstalHyprland";

const hostname: string = Process.exec("cat /etc/hostname") || "GNU/Linux";
const uptime = new Variable<string>("Just turned on")
    .poll(1000, () => {
        return Process.exec("uptime -p").replace(/^up /, "")
})();

function LockButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰌾",
        onClick: () => AstalHyprland.get_default().dispatch("exec", "hyprlock")
    } as Widget.ButtonProps)
}

function ColorPickerButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰴱",
        onClick: () => AstalHyprland.get_default().dispatch(
            "exec", 
            "sh $HOME/.config/eww/scripts/color-picker.sh"
        )
    } as Widget.ButtonProps)
}

function ScreenshotButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰹑",
        onClick: () => Process.exec_async(
            "bash -c 'hyprshot -m region -o $HOME/Screenshots'",
            () => {}
        )
    } as Widget.ButtonProps);
}

function SelectWallpaperButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰸉",
        onClick: () => Process.exec_async(
            "bash -c 'sh $HOME/.config/hypr/scripts/change-wallpaper.sh'",
            () => {}
        )
    } as Widget.ButtonProps);
}

function LogoutButton(): Widget.Button {
    return new Widget.Button({
        className: "nf",
        label: "󰗽",
        onClick: () => execAsync("astal open logout-menu")
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
                    label: hostname.toString()
                } as Widget.LabelProps),
                new Widget.Label({
                    className: "uptime",
                    xalign: 0,
                    label: uptime.as((uptime: string) => `󱡢  ${uptime}`)
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
