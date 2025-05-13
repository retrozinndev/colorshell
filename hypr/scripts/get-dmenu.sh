#!/usr/bin/env bash

# Checks environment for dmenu or dmenu-like apps
# and prints out a command to pipe of.
# -----------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From: https://github.com/retrozinndev/Hyprland-Dots

DMENUS=(
    "anyrun:--plugins:libstdin.so"
    "rofi:-dmenu"
    "wofi:--show:dmenu"
    "dmenu"
)

for dmenu in ${DMENUS[@]}; do
    name=$(printf "$dmenu" | awk -F: '{ print $1 }')
    cmd=$(env "$name" -h > /dev/null)
    code=$?

    if [[ ! $code == 127 ]]; then
        echo "$dmenu" | sed 's/:/ /g'
        break;
    fi
done
