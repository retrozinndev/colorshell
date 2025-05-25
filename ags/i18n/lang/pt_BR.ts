import { i18nStruct } from "../struct";

export default {
    language: "Português (Brasil)",

    cancel: "Cancelar",
    accept: "Ok",
    devices: "Dispositivos",
    others: "Outros",

    connected: "Conectado",
    disconnected: "Desconectado",
    unknown: "Desconhecido",
    connecting: "Conectando",
    limited: "Limitado",
    none: "Nenhum",

    disconnect: "Desconectar",
    connect: "Conectar",

    apps: "Aplicativos",
    clear: "Limpar",

    control_center: {
        tiles: {
            enabled: "Ligado",
            disabled: "Desligado",
            more: "Mais",

            network: {
                network: "Rede",
                wireless: "Wi-Fi",
                wired: "Cabeada"
            },
            recording: {
                title: "Gravação de Tela",
                disabled_desc: "Iniciar gravação",
                enabled_desc: "Parar gravação",
            },
            dnd: {
                title: "Não Perturbe"
            },
            night_light: {
                title: "Luz Noturna",
                default_desc: "Fidelidade"
            }
        },
        pages: {
            more_settings: "Mais configurações",
            sound: {
                title: "Som",
                description: "Controle a saída de áudio"
            },
            microphone: {
                title: "Microfone",
                description: "Configure a entrada de áudio"
            },
            night_light: {
                title: "Luz Noturna",
                description: "Controle os filtros de Luz Noturna e Gama",
                temperature: "Temperatura",
                gamma: "Gama"
            },
            bluetooth: {
                title: "Bluetooth",
                description: "Gerencie dispositivos Bluetooth",
                new_devices: "Novos Dispositivos",
                adapters: "Adaptadores",
                paired_devices: "Dispositivos Pareados",
                start_discovering: "Começar a procurar dispositivos",
                stop_discovering: "Parar de procurar dispositivos",
                pair_device: "Parear dispositivo",
                trust_device: "Confiar no dispositivo",
                unpair_device: "Desparear dispositivo",
                untrust_device: "Deixar de confiar no dispositivo"
            },
            network: {
                title: "Rede",
                interface: "Interface"
            }
        }
    },
    ask_popup: {
        title: "Pergunta"
    }
} as i18nStruct;
