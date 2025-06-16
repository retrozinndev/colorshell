#!/usr/bin/env bash

# This script executes the provided program with UWSM
# if in usage or launches it normally with hyprctl.
# ---------------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From: https://github.com/retrozinndev/colorshell


if uwsm check is-active; then
    hyprctl dispatch exec "uwsm app -- $@" > /dev/null
    exit 0
fi

hyprctl dispatch exec "$@" > /dev/null
