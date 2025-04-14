export type i18nStruct = {
    language: string,
    bar: {
        apps: {
            tooltip: string
        }
    },
    control_center: {
        tiles: {
            enabled: string,
            disabled: string,
            more: string,

            network: {
                network: string,
                connected: string,
                disconnected: string,
                unknown: string,
                connecting: string,
                wireless: string,
                wired: string
            },
            recording: {
                title: string,
                disabled_desc: string,
                enabled_desc: string,
            },
            dnd: {
                title: string
            },
            night_light: {
                title: string,
                default_desc: string
            }
        }
    },
    ask_popup: {
        title: string,
        options: {
            cancel: string,
            accept: string
        }
    }
};
