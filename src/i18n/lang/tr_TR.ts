import { i18nStruct } from "../struct";

export default {
    language: "Türkçe (Türkiye)",

    cancel: "İptal",
    accept: "Tamam",
    devices: "Cihazlar",
    others: "Diğerleri",

    connected: "Bağlanıldı",
    disconnected: "Bağlantı Kesildi",
    unknown: "Bilinmiyor",
    connecting: "Bağlanıyor",
    none: "Hiçbiri",
    limited: "Sınırlı",
    apps: "Uygulamalar",

    clear: "Temizle",

    connect: "Bağlan",
    disconnect: "Bağlantıyı Kes",
    copy_to_clipboard: "Panoya Kopyala",
    battery: "Pil",

    media: {
        play: "Oynat",
        pause: "Duraklat",
        next: "Sonraki",
        previous: "Önceki",
        loop: "Döngü",
        no_loop: "Döngü yok",
        song_loop: "Şarkıyı döngüye al",
        shuffle_order: "Karıştır",
        follow_order: "Sırayı takip et",
        no_artist: "Sanatçı yok",
        no_title: "Başlık yok"
    },
    control_center: {
        tiles: {
            enabled: "Etkin",
            disabled: "Devre Dışı",
            more: "Daha Fazla",

            network: {
                network: "Ağ",
                wireless: "Kablosuz",
                wired: "Kablolu"
            },
            recording: {
                title: "Ekran Kaydı",
                disabled_desc: "Kaydı Başlat",
                enabled_desc: "Kaydı Durdur",
            },
            dnd: {
                title: "Rahatsız Etmeyin"
            },
            night_light: {
                title: "Gece Işığı",
                default_desc: "Sadakat"
            }
        },
        pages: {
            more_settings: "Daha fazla ayar",
            sound: {
                title: "Ses",
                description: "Ses çıkışını yapılandır"
            },
            microphone: {
                title: "Mikrofon",
                description: "Ses girişini yapılandır"
            },
            night_light: {
                title: "Gece Işığı",
                description: "Gece Işığı ve Gama filtrelerini kontrol et",
                gamma: "Gama",
                temperature: "Sıcaklık"
            },
            backlight: {
                title: "Arka Işık",
                description: "Ekranların parlaklığını kontrol et",
                refresh: "Arka ışıkları yenile"
            },
            bluetooth: {
                title: "Bluetooth",
                description: "Bluetooth cihazlarını yönet",
                new_devices: "Yeni cihazlar",
                adapters: "Adaptörler",
                paired_devices: "Eşleştirilmiş Cihazlar",
                start_discovering: "Keşfetmeyi Başlat",
                stop_discovering: "Keşfetmeyi Durdur",
                untrust_device: "Güvenilmeyen cihaz",
                unpair_device: "Eşleşmeyi Kaldır",
                trust_device: "Güvenilen cihaz",
                pair_device: "Cihaz Eşleştir"
            },
            network: {
                title: "Ağ",
                interface: "Ara yüzü"
            }
        }
    },
    ask_popup: {
        title: "Soru"
    }
} satisfies i18nStruct;
