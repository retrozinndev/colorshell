#!/usr/bin/env bash

# This script loads/generate color schemes from current
# wallpaper using pywal16.
# ----------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/colorshell

if ! [[ -f "$XDG_CONFIG_HOME/hypr/hyprpaper.conf" ]]; then
    echo "[error] wallpaper file not found!"
    exit 1
fi

raw=`cat "$XDG_CONFIG_HOME/hypr/hyprpaper.conf" | grep '$wallpaper =' | sed -e 's/^$wallpaper = //'`
wallpaper=${raw/\~/"$HOME"}
[[ -d "$XDG_CACHE_HOME/wal" ]] && wal -R || sh $XDG_CONFIG_HOME/hypr/scripts/change-wallpaper.sh "$wallpaper"

