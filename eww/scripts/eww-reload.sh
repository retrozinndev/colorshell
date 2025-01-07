#!/usr/bin/env bash

# This script reloads eww configuration and updates
# window status variables, used in eww-window.sh
# script. Avoids issues with widgets that use status 
# variables to dinamically change their content.
# ----------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/Hyprland-Dots

# TODO

open_windows=$(eww active-windows | awk -F: '{ print $1 }' | sed -e 's/ /\\[n]/g')
echo $open_windows

#for window in $()
