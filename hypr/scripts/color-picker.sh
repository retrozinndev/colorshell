#!/usr/bin/env bash

send_notification() {
    notify-send -u normal -a "Color Picker" "$1" "$2"
}

# Check if user has hyprpicker installed
if ! [[ -f /bin/hyprpicker ]]; then
    send_notification "An error occurred" "Looks like you don't have Hyprpicker installed! Try installing it before using the Color Picker tool."
    exit 1
fi

selected_color=$(hyprpicker)

if ! [[ $selected_color == "" ]]; then
    wl-copy $selected_color
    send_notification "Selected Color" "The selected color is <span foreground='$selected_color'>$selected_color</span>, it was also copied to your clipboard!"
fi
