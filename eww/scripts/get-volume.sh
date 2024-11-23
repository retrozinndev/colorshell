#!/usr/bin/env bash

WP_VOLUME=$(wpctl get-volume @DEFAULT_AUDIO_SINK@ | sed -e 's/^Volume: //')

formatted_volume() {
    if ! [ $WP_VOLUME == "1.00" ]; then
        echo "${WP_VOLUME#0.}%"
    else
        echo "100%"
    fi
}

formatted_volume