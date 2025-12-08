import { i18nStruct } from "../struct";

export default {
  language: "Français (France)",

  cancel: "Annuler",
  accept: "Ok",
  devices: "Appareils",
  others: "Autres",

  connected: "Connecté",
  disconnected: "Déconnecté",
  unknown: "Inconnu",
  connecting: "Connexion en cours",
  none: "Aucun",
  limited: "Limité",
  apps: "Applications",

  clear: "Effacer",

  connect: "Se connecter",
  disconnect: "Se déconnecter",
  copy_to_clipboard: "Copier dans le presse-papiers",
  battery: "Batterie",

  media: {
    play: "Lecture",
    pause: "Pause",
    next: "Suivant",
    previous: "Précédent",
    loop: "Boucle",
    no_loop: "Pas de boucle",
    song_loop: "Répéter le morceau",
    shuffle_order: "Lecture aléatoire",
    follow_order: "Lecture dans l'ordre",
    no_artist: "Aucun artiste",
    no_title: "Aucun titre",
  },
  control_center: {
    tiles: {
      enabled: "Activé",
      disabled: "Désactivé",
      more: "Plus",

      network: {
        network: "Réseau",
        wireless: "Sans fil",
        wired: "Filaire",
      },
      recording: {
        title: "Enregistrement de l'écran",
        disabled_desc: "Démarrer l'enregistrement",
        enabled_desc: "Arrêter l'enregistrement",
      },
      dnd: {
        title: "Ne pas déranger",
      },
      night_light: {
        title: "Éclairage nocturne",
        default_desc: "Fidélité",
      },
    },
    pages: {
      more_settings: "Plus de paramètres",
      sound: {
        title: "Son",
        description: "Configurer la sortie audio",
      },
      microphone: {
        title: "Microphone",
        description: "Configurer l'entrée audio",
      },
      night_light: {
        title: "Éclairage nocturne",
        description: "Contrôler l'éclairage nocturne et les filtres Gamma",
        gamma: "Gamma",
        temperature: "Température",
      },
      backlight: {
        title: "Rétroéclairage",
        description: "Contrôler la luminosité de vos écrans",
        refresh: "Actualiser les rétroéclairages",
      },
      bluetooth: {
        title: "Bluetooth",
        description: "Gérer les appareils Bluetooth",
        new_devices: "Nouveaux appareils",
        adapters: "Adaptateurs",
        paired_devices: "Appareils appairés",
        start_discovering: "Démarrer la recherche",
        stop_discovering: "Arrêter la recherche",
        untrust_device: "Retirer la confiance",
        unpair_device: "Désappairer",
        trust_device: "Faire confiance",
        pair_device: "Appairer",
      },
      network: {
        title: "Réseau",
        interface: "Interface",
      },
    },
  },
  ask_popup: {
    title: "Question",
  },
} satisfies i18nStruct;
