import { i18nStruct } from "../struct";

export default {
    language: "日本語（日本）",

    cancel: "キャンセル",
    accept: "OK",
    devices: "デバイス",
    others: "その他",

    connected: "接続済み",
    disconnected: "未接続",
    unknown: "不明",
    connecting: "接続中",
    none: "なし",
    limited: "制限付き",
    apps: "アプリケーション",

    clear: "クリア",

    connect: "接続",
    disconnect: "切断",
    copy_to_clipboard: "クリップボードにコピー",
    battery: "バッテリー",

    media: {
        play: "再生",
        pause: "一時停止",
        next: "次",
        previous: "前",
        loop: "ループ",
        no_loop: "ループなし",
        song_loop: "ループ再生",
        shuffle_order: "シャッフル",
        follow_order: "順番に従う",
        no_artist: "アーティストなし",
        no_title: "タイトルなし"
    },
    control_center: {
        tiles: {
            enabled: "有効",
            disabled: "無効",
            more: "更多",

            network: {
                network: "ネットワーク",
                wireless: "無線",
                wired: "有線"
            },
            recording: {
                title: "画面録画",
                disabled_desc: "録画を開始",
                enabled_desc: "録画を停止",
            },
            dnd: {
                title: "おやすみモード"
            },
            night_light: {
                title: "ナイトライト",
                default_desc: "デフォルト"
            }
        },
        pages: {
            more_settings: "更多设置",
            sound: {
                title: "サウンド",
                description: "音声出力を構成"
            },
            microphone: {
                title: "マイク",
                description: "音声入力を構成"
            },
            night_light: {
                title: "ナイトライト",
                description: "ナイトライトとガンマフィルターを制御",
                gamma: "ガンマ",
                temperature: "色温度"
            },
            backlight: {
                title: "バックライト",
                description: "画面の明るさを制御",
                refresh: "バックライトを更新"
            },
            bluetooth: {
                title: "Bluetooth",
                description: "Bluetoothデバイスを管理",
                new_devices: "新しいデバイス",
                adapters: "アダプター",
                paired_devices: "ペアリングされたデバイス",
                start_discovering: "発見を開始",
                stop_discovering: "発見を停止",
                untrust_device: "デバイスの信頼を解除",
                unpair_device: "デバイスのペアリングを解除",
                trust_device: "デバイスを信頼する",
                pair_device: "デバイスをペアリングする"
            },
            network: {
                title: "ネットワーク",
                interface: "インターフェース"
            }
        }
    },
    ask_popup: {
        title: "質問"
    }
} satisfies i18nStruct;
