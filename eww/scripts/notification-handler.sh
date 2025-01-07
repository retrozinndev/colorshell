#!/usr/bin/env bash

# A notification logger, saves notifications inside
# a file instead of saving on memory! file is located
# in `~/.cache/notification-history.json`.
# -----------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/Hyprland-Dots

set -e

json_history_file="$HOME/.cache/notification-history.json"
lock_file="$HOME/.cache/notification-history.lock"

# get max entries from mako file
max_entries=$(cat $HOME/.config/mako/config | grep "max-history=" | awk -F= '{ print $2 }')

touch $json_history_file

function Init_history_file() {
    if [[ $(cat $json_history_file) == "" ]]; then
        echo -e "{\"history\":[]}" > $json_history_file
    fi
}

function Check_history_file() {
    if ! [[ -f $json_history_file ]]; then
        touch $json_history_file
    fi
}

function Treat_specials() {
    echo $@ | sed -e 's/\\[n]/\\n/g' -e 's/&/&amp;/g'
}

Check_history_file
Init_history_file

json_latest_notification="$(makoctl history | jq -c '.data[][0]')"

while true; do
    sleep .1
    if ! [[ -f $lock_file ]]; then
        json_actual_latest="$(makoctl history | jq -c '.data[][0]')"
        if ! [[ $json_actual_latest == $json_latest_notification ]]; then
            if [[ $(echo $(Treat_specials $json_actual_latest) | jq -c '.id.data') == $(echo $(Treat_specials $json_latest_notification) | jq -c '.id.data') ]]; then
                if [[ $(echo $(Treat_specials $json_actual_latest) | jq -c '.summary.data') == $(echo $(Treat_specials $json_latest_notification) | jq -c '.summary.data') ]]; then
                    continue
                else
                    sh $HOME/.config/eww/scripts/notification-remove.sh $(echo $(Treat_specials $json_latest_notification) | jq -c '.id.data') &
                fi
            fi

            Check_history_file
            Init_history_file
            json_latest_notification=$(makoctl history | jq -c '.data[][0]')
            json_first_notification=$(jq -c ".history[$(jq -c '.history | length - 1' $json_history_file)]" $json_history_file)

            if ! [[ $(makoctl mode) =~ "dnd" ]]; then
                sh $HOME/.config/eww/scripts/notification-popup.sh "$(Treat_specials $json_latest_notification)" & 
            fi

            if [[ $(jq -c ".history | length" $json_history_file) == $max_entries ]]; then 
                sh $HOME/.config/eww/scripts/notification-remove.sh $(echo $json_first_notification | jq -c '.id.data')
            fi

            json_output=$(jq -c ".history |= [$(Treat_specials $json_latest_notification)] + ." $json_history_file)
            
            echo -e "$json_output" > $json_history_file
        fi
    fi
done
