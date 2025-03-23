import { i18nStruct } from "../intl";

export default {
    language: "Português (Brasil)",
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
            }
        }
    },
    ask_popup: {
        title: "Pergunta",
        options: {
            cancel: "Cancelar",
            accept: "Ok"
        }
    }
} as i18nStruct;
