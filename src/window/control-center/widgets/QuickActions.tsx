import { Gtk } from "ags/gtk4";
import Windows from "../../../window";
import Wallpaper from "../../../modules/wallpaper";
import { execApp } from "../../../modules/apps";
import Screenshot from "../../../modules/screenshot";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import { time } from "../../../modules/utils";


const userFace = Gio.File.new_for_path(`${GLib.get_home_dir()}/.face`);
let bootTime: GLib.DateTime = GLib.DateTime.new_now_local();

try {
    const info = Gio.File.new_for_path("/dev").query_info("time::created", Gio.FileQueryInfoFlags.NONE, null);
    const time = info.get_creation_date_time();
    if(!time)
        throw new Error("Couldn't get creation date of /dev");

    bootTime = time;
} catch(e) {
    console.warn("Failed to retrieve uptime:\n", e);
}

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
          setTimeout(() => execApp("hyprpicker"), 700);
      }}
    /> as Gtk.Button;
}

function ScreenshotButton(): Gtk.Button {
    return <Gtk.Button iconName={"applets-screenshooter-symbolic"}
      onClicked={() => {
          Windows.getDefault().close("control-center");
          setTimeout(() => Screenshot.getDefault().take(), 700);
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
                      label={time(t => {
                          const date = GLib.DateTime.new_from_unix_utc_usec(t.difference(bootTime));
                          return `${date.get_hour() > 0 ?
                                  `${date.get_hour()}hr${date.get_hour() > 1 ? "s" : ""}, `
                              : ""}${
                              date.get_minute() > 0 ?
                                  `${date.get_minute()}min${date.get_minute() > 1 ? "s" : ""}`
                              : ""
                          }`;
                      })} />
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
