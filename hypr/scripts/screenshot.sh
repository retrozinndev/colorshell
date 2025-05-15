#!/usr/bin/env bash

# This script handles taking a screenshot using the
# hyprshot tool.
# --------------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/colorshell


# exit slurp and quit if slurp(region selection) is running
killall slurp && exit 0

if [[ -z $(command -v hyprshot) ]]; then
    echo "[err] you don't have hyprshot installed, please install it first"
    exit 1
fi

if [[ "$1" == "full" ]]; then
    hyprshot -m active -m output -o "$(xdg-user-dir PICTURES)/Screenshots"
    exit 0
fi

hyprshot -m region -o "$(xdg-user-dir PICTURES)/Screenshots"
