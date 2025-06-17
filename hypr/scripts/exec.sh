#!/usr/bin/env bash

# This script executes the provided program with UWSM
# if in usage or launches it normally with hyprctl.
# ---------------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From: https://github.com/retrozinndev/colorshell


if uwsm check is-active "hyprland-uwsm.desktop"; then
    exec uwsm app -- "$@"
    exit 0
fi

exec "$@"
