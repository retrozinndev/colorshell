#!/usr/bin/env bash

# This script saves hyprsunset values into a file using
# hyprlang, in `$XDG_CONFIG_HOME/hypr/hyprsunset.conf`.
# It is used to save last user configuration on computer
# shutdown.
# --------------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/colorshell

[[ -z $XDG_CONFIG_HOME ]] && XDG_CONFIG_HOME="$HOME/.config"

if ! [[ "$XDG_CURRENT_DESKTOP" =~ "Hyprland" ]]; then
    echo "[error] Seems like you're not running Hyprland! Exiting"
    exit 1
fi

if [[ -z $(command -v hyprsunset) ]]; then
    echo "[error] Couldn't save hyprsunset settings: it's either not installed or not in PATH"
    exit 1
fi

output="$XDG_CONFIG_HOME/hypr/hyprsunset.conf"

temperature=$(hyprctl hyprsunset temperature || 6000)
gamma=$(hyprctl hyprsunset gamma || 100)

printf "temperature = %d\ngamma = %d" "$temperature" "$gamma" > $output
