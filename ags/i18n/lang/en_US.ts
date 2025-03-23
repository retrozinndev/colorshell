import { i18nStruct } from "../intl";

export default {
    language: "English (United States)",
    bar: {
        apps: {
            tooltip: "Applications"
        }
    },
    control_center: {
        tiles: {
            enabled: "Enabled",
            disabled: "Disabled",
            more: "More",

            network: {
                network: "Network",
                connected: "Connected",
                disconnected: "Disconnected",
                unknown: "Unknown",
                connecting: "Connecting",
                wireless: "Wireless",
                wired: "Wired"
            },
            recording: {
                title: "Screen Recording",
                disabled_desc: "Start recording",
                enabled_desc: "Stop recording",
            },
            dnd: {
                title: "Do Not Disturb"
            }
        }
    },
    ask_popup: {
        title: "Question",
        options: {
            cancel: "Cancel",
            accept: "Ok"
        }
    }
} as i18nStruct;
