import { i18nStruct } from "../struct";

export default {
    language: "Português (Brasil)",

    cancel: "Cancelar",
    accept: "Ok",

    bar: {
        apps: {
            tooltip: "Aplicativos"
        }
    },
    control_center: {
        tiles: {
            enabled: "Ligado",
            disabled: "Desligado",
            more: "Mais",

            network: {
                network: "Rede",
                connected: "Conectado",
                disconnected: "Desconectado",
                unknown: "Desconhecido",
                connecting: "Conectando",
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
        }
    },
    ask_popup: {
        title: "Pergunta"
    }
} as i18nStruct;
