#!/usr/bin/env bash

# Removes notification from popup by id provided 
# in arg1.
# ---------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/Hyprland-Dots


if ! [[ $1 == "" ]]; then
    json_popup_notifications=$(eww get json_popup_notifications)
    if [[ $(eww get json_popup_notifications | jq -c '.notifications | length') == 1 ]]; then
        sh $HOME/.config/eww/scripts/eww-window.sh close floating-notifications >> /dev/null
    fi
    eww update "json_popup_notifications=$(echo $json_popup_notifications | jq -c "del(.notifications[] | select(.id.data == $1))")"
    exit 0
fi

echo "[error] Notification Id not provided!"
exit 1
