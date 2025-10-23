import { i18nStruct } from "../struct";

export default {
    language: "Русский (Российская Федерация)",

    cancel: "Отменить",
    accept: "Ок",
    devices: "Устройства",
    others: "Другие",

    connected: "Подключён",
    disconnected: "Отключён",
    unknown: "Неизвестный",
    connecting: "Подключение",
    none: "Ничего",
    limited: "Ограничен",
    apps: "Приложения",

    clear: "Очистить",

    connect: "Подключиться",
    disconnect: "Отключиться",

    control_center: {
        tiles: {
            enabled: "Включить",
            disabled: "Отключить",
            more: "Больше",

            network: {
                network: "Инетрнет",
                wireless: "Беспроводное",
                wired: "Проводное"
            },
            recording: {
                title: "Запись экрана",
                disabled_desc: "Начать запись",
                enabled_desc: "Остановить запись",
            },
            dnd: {
                title: "Не беспокоить"
            },
            night_light: {
                title: "Ночной свет",
                default_desc: "Тонн"
            }
        },
        pages: {
            more_settings: "Больше настроек",
            sound: {
                title: "Звук",
                description: "Настройка вывода звука"
            },
            microphone: {
                title: "Микрофон",
                description: "Настройка ввода звука"
            },
            night_light: {
                title: "Ночной свет",
                description: "Контроль интенсивности фильтрации синего света",
                gamma: "Гамма",
                temperature: "Температура"
            },
            bluetooth: {
                title: "Bluetooth",
                description: "Управление Bluetooth устройствами",
                new_devices: "Новые устройства",
                adapters: "Адапреты",
                paired_devices: "Привязанные устройства",
                start_discovering: "Начать поиск",
                stop_discovering: "Остановить поиск",
                untrust_device: "Недоверенное устройство",
                unpair_device: "Отвязанное устройство",
                trust_device: "Доверенное устройство",
                pair_device: "Привязанное устройство"
            },
            network: {
                title: "Интернет",
                interface: "Интерфейсы"
            }
        }
    },
    ask_popup: {
        title: "Вопрос"
    }
} as i18nStruct;
