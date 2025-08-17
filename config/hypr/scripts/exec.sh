#!/usr/bin/env bash

# This script executes the provided program with UWSM
# if active, or else normally.
# ---------------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From: https://github.com/retrozinndev/colorshell


if uwsm check is-active; then
    exec uwsm app -- "$@"
    exit 0
fi

if [[ $1 =~ [.]desktop$ ]]; then
    gtk-launch $@
    exit 0
fi

exec "$@"
