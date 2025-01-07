#!/usr/bin/env bash

# Removes notification from history file by 
# id provided in arg1.
# ---------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/Hyprland-Dots

json_history_file="$HOME/.cache/notification-history.json"
lock_file="$HOME/.cache/notification-history.lock"

if [[ -f $HOME/.cache/notification-history.json ]] && ! [[ $1 == "" ]]; then
    touch $lock_file
    json_updated_history=$(jq -c "del(.history[] | select(.id.data == $1))" $json_history_file)
    echo -e $json_updated_history > $json_history_file
    rm -f $lock_file
else
    echo "[error] Notification history not reachable or id not provided"
    exit 1
fi
