export type i18nStruct = {
    language: string,

    cancel: string,
    accept: string,

    connected: string,
    disconnected: string,
    connecting: string,
    unknown: string,
    none: string,
    limited: string,

    devices: string,
    others: string,

    disconnect: string,
    connect: string,

    apps: string;
    clear: string;

    control_center: {
        tiles: {
            enabled: string,
            disabled: string,
            more: string,

            network: {
                network: string,
                wireless: string,
                wired: string
            },
            recording: {
                title: string,
                disabled_desc: string,
                enabled_desc: string
            },
            dnd: {
                title: string
            },
            night_light: {
                title: string,
                default_desc: string
            }
        },
        pages: {
            more_settings: string,

            sound: {
                title: string,
                description: string
            },
            microphone: {
                title: string,
                description: string
            },
            network: {
                title: string,
                interface: string
            },
            bluetooth: {
                title: string,
                description: string,
                adapters: string,
                new_devices: string,
                paired_devices: string,
                start_discovering: string,
                stop_discovering: string,
                trust_device: string,
                untrust_device: string,
                pair_device: string,
                unpair_device: string
            },
            night_light: {
                title: string,
                description: string,
                temperature: string,
                gamma: string
            }
        }
    },
    ask_popup: {
        title: string
    }
};
