#!/usr/bin/env bash

# This script loads/generate color schemes from current
# wallpaper using pywal16.
# ----------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/colorshell

if ! [[ -f "$HOME/.config/hypr/hyprpaper.conf" ]]; then
    notify-send -a "Wallpaper" "Couldn't load" "Wallpaper file not found! Please check for the wallpaper: $wallpaper."
    exit 1
fi

wallpaper="$(cat $HOME'/.config/hypr/hyprpaper.conf' | grep '$wallpaper =' | sed -e 's/^$wallpaper = //')"

if [[ -d "$HOME/.cache/wal" ]]; then
    wal -R
else
    wal -q -t --cols16 darken -i "$wallpaper"
fi
