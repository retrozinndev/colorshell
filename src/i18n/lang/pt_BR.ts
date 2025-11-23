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
    copy_to_clipboard: "Copiar para a Área de Transferência",
    battery: "Bateria",

    media: {
        next: "Próxima faixa",
        pause: "Pausar",
        play: "Tocar",
        previous: "Faixa anterior",
        loop: "Repetir",
        no_loop: "Não repetir",
        song_loop: "Repetir faixa",
        follow_order: "Seguir ordem",
        shuffle_order: "Ordem aleatória",
        no_title: "Sem título",
        no_artist: "Sem artista"
    },
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
            backlight: {
                title: "Brilho",
                description: "Controle o nível de brilho das suas telas",
                refresh: "Recarregar"
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
} satisfies i18nStruct;
