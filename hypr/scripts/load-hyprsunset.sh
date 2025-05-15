#!/usr/bin/env bash

# This script loads hyprsunset settings previously
# saved by the save-hyprsunset.sh script on shutdown.
# --------------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/colorshell

[[ -z $XDG_CONFIG_HOME ]] && XDG_CONFIG_HOME="$HOME/.config"

file_="$XDG_CONFIG_HOME/hypr/hyprsunset.conf"

if ! [[ -f "$file_" ]]; then
    echo "[warn] Couldn't load hyprsunset config: file not found"
    exit 0
fi

if ! [[ "$XDG_CURRENT_DESKTOP" =~ "Hyprland" ]]; then
    echo "[error] Seems like you're not running Hyprland! Exiting"
    exit 1
fi

if [[ -z $(command -v hyprsunset) ]]; then
    echo "[error] Couldn't load hyprsunset settings: it's either not installed or not in PATH"
    exit 1
fi

temperature=$(cat "$file_" | grep -E "^temperature = (.*)" | awk -F= '{ print $2 }')> /dev/null
gamma=$(cat "$file_" | grep -E "^gamma = (.*)" | awk -F= '{ print $2 }')> /dev/null

hyprctl hyprsunset temperature $temperature
sleep .05
hyprctl hyprsunset gamma $gamma
