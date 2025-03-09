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
            more: "Mais",

            network: {
                network: "Rede",
                connected: "Conectado",
                disconnected: "Desconectado",
                unknown: "Desconhecido",
                connecting: "Conectando",
                wireless: "Wireless",
                wired: "Cabeado"
            },
            recording: {
                title: "Gravação de Tela",
                disabled_description: "Iniciar gravação",
                enabled_description: "Parar gravação",
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
