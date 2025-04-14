import { i18nStruct } from "../struct";

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
            },
            night_light: {
                title: "Night Light",
                default_desc: "Fidelity"
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
