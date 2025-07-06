import { Gtk } from "ags/gtk4";
import { Windows } from "../../windows";
import { Wallpaper } from "../../scripts/wallpaper";
import { execApp } from "../../scripts/apps";
import GLib from "gi://GLib?version=2.0";
import { Accessor } from "ags";
import { createPoll } from "ags/time";



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
        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.START}
          hexpand={true} class={"left"}>

            <Gtk.Label class={"hostname"} xalign={0} tooltipText={"Host name"}
              label={GLib.get_host_name()} />

            <Gtk.Box>
                <Gtk.Image iconName={"hourglass-symbolic"} />
                <Gtk.Label class={"uptime"} xalign={0} tooltipText={"Up time"}
                  label={uptime.as(str => str.replace(/^up /, ""))} />
            </Gtk.Box>
        </Gtk.Box>

        <Gtk.Box class={"right button-row"} halign={Gtk.Align.END} 
          hexpand={true}>

            <LockButton />
            <ColorPickerButton />
            <ScreenshotButton />
            <SelectWallpaperButton />
            <LogoutButton />
        </Gtk.Box>
    </Gtk.Box> as Gtk.Box;
