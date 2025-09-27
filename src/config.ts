import { Config } from "./modules/config";

import GLib from "gi://GLib?version=2.0";


const generalConfigDefaults = {
    notifications: {
        timeout_low: 4000,
        timeout_normal: 6000,
        timeout_critical: 0,
        /** notification popup horizontal position. can be "left" or "right" 
        * @default "right" */
        position_h: "right",
        /** vertical notification popup position. can be "top" or "bottom" 
        * @default "top" */
        position_v: "top"
    },

    night_light: {
        /** whether to save night light values to disk */
        save_on_shutdown: true
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

    clock: {
        /** use the same format as gnu's `date` command */
        date_format: "%A %d, %H:%M"
    },

    misc: {
        play_bell_on_volume_change: true
    }
};

const userDataDefaults = {
    /** last default adapter */
    bluetooth_default_adapter: undefined,

    control_center: {
        /** last default backlight */
        default_backlight: undefined
    },

    night_light: {
        /** last blue light filter temperature */
        temperature: 6000,
        /** last gamma filter value */
        gamma: 100,
        /** wheter to enable identity filters("disables" the filters) */
        identity: true
    }
};

export const userData = new Config<
    keyof typeof userDataDefaults, 
    (typeof userDataDefaults)[keyof typeof userDataDefaults]
>(
    `${GLib.get_user_data_dir()}/colorshell/data.json`,
    userDataDefaults
);

export const generalConfig = new Config<keyof typeof generalConfigDefaults, 
    typeof generalConfigDefaults[keyof typeof generalConfigDefaults]>(
        `${GLib.get_user_config_dir()}/colorshell/config.json`, generalConfigDefaults
);
