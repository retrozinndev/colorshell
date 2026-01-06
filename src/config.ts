import { Config } from "./modules/config";
import { NightLight } from "./modules/nightlight";
import { WallpaperPositioning, WalMode } from "./modules/wallpaper";

import GLib from "gi://GLib?version=2.0";


const generalConfigDefaults = {
    notifications: {
        /** low-priority notification timeout 
          * @default 4000 */
        timeout_low: 4000,
        /** regular notification timeout 
          * @default 6000 */
        timeout_normal: 6000,
        /** critical/very important notification timeout 
          * @default 0 */
        timeout_critical: 0,
        /** notification popup horizontal position. can be "left" or "right" 
          * @default "right" */
        position_h: "right",
        /** vertical notification popup position. can be "top" or "bottom" 
          * @default "top" */
        position_v: "top",
        /** dismiss notification popup when it gets unhovered.
          * breaks hold_on_hover a bit, notification will instantly be dismissed after unhover
          * @default false */
        dismiss_on_unhover: false,
        /** hold the notification popup while hovering it.
          * @default true */
        hold_on_hover: true
    },

    night_light: {
        /** whether to save night light/gamma filter values to disk when clicking 
          * on power/session actions(suspend, log out, power off, reboot)
          * @default true */
        save_on_shutdown: true
    },

    wallpaper: {
        /** wallpaper positioning mode (hyprpaper) */
        positioning: "cover" satisfies WallpaperPositioning,
        /** color generation mode. 
          * darken: picks darker colors; lighten: picks brighter colors */
        color_mode: "darken" satisfies WalMode,
        /** whether to enable Hyprland's random splash text pn the wallpaper.
         * only takes effect after a hyprpaper restart. (`systemctl restart --user hyprpaper`) */
        splash: true
    },

    workspaces: {
        /** breaks `enable_helper`, makes all workspaces show their respective ID 
          * by default */
        always_show_id: false,
        /** this is the function that shows the Workspace's IDs 
          * around the current workspace if one breaks the crescent order.
          * It basically helps keyboard navigation between workspaces.
          * ---
          * Example: 1(empty, current, shows ID), 2(empty, does not appear(makes 
          * the previous not to be in a crescent order)), 3(not empty, shows ID) */
        enable_helper: true,
        /** hide workspace indicator if there's only one active workspace */
        hide_if_single: false
    },

    aliases: {
        terminal: "kitty",
        file_manager: "nautilus",
        media: "amberol"
    },

    clock: {
        /** use the same format as gnu's `date` command 
          * @default "%A %d, %H:%M" // -> "tuesday, 11, 15:44" */
        date_format: "%A %d, %H:%M"
    },

    misc: {
        /** plays a system-bell sound effect using canberra-gtk-play on volume change 
          * @default true */
        play_bell_on_volume_change: true
    }
};

const userDataDefaults = {
    /** last default adapter */
    bluetooth_default_adapter: undefined as unknown as string,

    control_center: {
        /** last default backlight */
        default_backlight: undefined as unknown as string
    },

    night_light: {
        /** last blue light filter temperature */
        temperature: NightLight.identityTemperature,
        /** last gamma filter value */
        gamma: NightLight.maxGamma,
        /** wheter to enable identity filters("disables" the filters) */
        identity: true
    }
};

export const userData = new Config<
    keyof typeof userDataDefaults, 
    (typeof userDataDefaults)[keyof typeof userDataDefaults]
>(
    `${GLib.get_user_data_dir()}/colorshell/data.json`,
    userDataDefaults,
    false
);

export const generalConfig = new Config<
    keyof typeof generalConfigDefaults, 
    typeof generalConfigDefaults[keyof typeof generalConfigDefaults]
>(
    `${GLib.get_user_config_dir()}/colorshell/config.json`, 
    generalConfigDefaults
);
