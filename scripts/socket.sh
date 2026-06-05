#!/usr/bin/env bash

pidfile="$XDG_RUNTIME_DIR/colorshell/.pid"
sock="$XDG_RUNTIME_DIR/colorshell/.sock"

if [ -f "$pidfile" ] && ps -p `cat "$pidfile"` > /dev/null 2>&1; then
    if command -v socat > /dev/null 2>&1; then
        echo "$@" | socat - "$sock"
        exit ${?:-"0"}
    else
        echo "\e[33m[warn]\e[0m \`socat\` not installed, falling back to remote instance communication"
    fi
fi
