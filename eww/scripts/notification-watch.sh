#!/usr/bin/env bash

# This script watches notification file changes
# and output file contents.
# -----------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/Hyprland-Dots

set -e

json_history_file="$HOME/.cache/notification-history.json"

if ! [[ -f $json_history_file ]]; then
    echo -e "{\"history\":[]}" > $json_history_file
fi

json_history="$(cat $json_history_file)"

echo $json_history

while true; do
    sleep .1
    json_newest_history=$(cat $json_history_file)

    if ! [[ "$json_history" == "$json_newest_history" ]]; then
        json_history="$json_newest_history"
        echo $json_history
    fi
done

exit 0
