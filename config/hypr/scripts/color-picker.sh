#!/usr/bin/env bash

function send_notification() {
    (notify-send -u normal -a "color-picker" "$1" "$2" > /dev/null 2>&1) || \
        (echo "$1: $2")
}

# Check if hyprpicker is installed
if ! command -v hyprpicker > /dev/null; then
    send_notification "An error occurred" "Looks like you don't have hyprpicker installed! Try installing it before using the Color Picker tool."
    exit 1
fi

raw_output=`hyprpicker -al 2> /dev/null`
selected_color=`echo $raw_output | xargs | sed -e 's/ //g'`

if ! [[ -z $selected_color ]]; then
    send_notification "Selected Color" "The selected color is <span foreground='$selected_color'>$selected_color</span>, it was also copied to your clipboard!"
fi
