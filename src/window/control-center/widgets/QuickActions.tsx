import { Gtk } from "ags/gtk4";
import { Windows } from "../../../windows";
import { Wallpaper } from "../../../modules/wallpaper";
import { execApp } from "../../../modules/apps";
import { Accessor } from "ags";
import { createPoll } from "ags/time";

import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";


const userFace: Gio.File = Gio.File.new_for_path(`${GLib.get_home_dir()}/.face`);
const uptime: Accessor<string> = createPoll("Just turned on", 1000, "uptime -p"); 

function LockButton(): Gtk.Button {
    return <Gtk.Button iconName={"system-lock-screen-symbolic"} 
      onClicked={() => {
          Windows.getDefault().close("control-center");
          execApp("hyprlock");
      }} 
    /> as Gtk.Button;
}

function ColorPickerButton(): Gtk.Button {
    return <Gtk.Button iconName={"color-select-symbolic"}
      onClicked={() => {
          Windows.getDefault().close("control-center");
          execApp("sh $HOME/.config/hypr/scripts/color-picker.sh");
      }}
    /> as Gtk.Button;
}

function ScreenshotButton(): Gtk.Button {
    return <Gtk.Button iconName={"applets-screenshooter-symbolic"}
      onClicked={() => {
          Windows.getDefault().close("control-center");
          execApp(`sh ${GLib.get_user_config_dir()}/hypr/scripts/screenshot.sh`);
      }}
    /> as Gtk.Button;
}

function SelectWallpaperButton(): Gtk.Button {
    return <Gtk.Button iconName={"preferences-desktop-wallpaper-symbolic"}
      onClicked={() => {
          Windows.getDefault().close("control-center");
          Wallpaper.getDefault().pickWallpaper();
      }}
    /> as Gtk.Button;
}

function LogoutButton(): Gtk.Button {
    return <Gtk.Button iconName={"system-shutdown-symbolic"}
      onClicked={() => {
          Windows.getDefault().close("control-center");
          Windows.getDefault().open("logout-menu");
      }}
    /> as Gtk.Button;
}

export const QuickActions = () => 
    <Gtk.Box class={"quickactions"}>
        <Gtk.Box halign={Gtk.Align.START} class={"left"} hexpand>
            {userFace.query_exists(null) && 
                <Gtk.Box class={"user-face"} css={
                  `background-image: url("file://${userFace.get_path()!}");`} 
                />
            }
            <Gtk.Box orientation={Gtk.Orientation.VERTICAL}>
                <Gtk.Box class={"user-host"}>
                    <Gtk.Label class={"user"} xalign={0} 
                      label={GLib.get_user_name()} />
                    <Gtk.Label class={"host"} xalign={0} yalign={.8}
                      label={`@${GLib.get_host_name()}`} />
                </Gtk.Box>

                <Gtk.Box>
                    <Gtk.Image iconName={"hourglass-symbolic"} />
                    <Gtk.Label class={"uptime"} xalign={0} tooltipText={"Up time"}
                      label={uptime.as(str => str.replace(/^up /, ""))} />
                </Gtk.Box>
            </Gtk.Box>
        </Gtk.Box>

        <Gtk.Box class={"right button-row"} halign={Gtk.Align.END} hexpand>
            <LockButton />
            <ColorPickerButton />
            <ScreenshotButton />
            <SelectWallpaperButton />
            <LogoutButton />
        </Gtk.Box>
    </Gtk.Box> as Gtk.Box;
