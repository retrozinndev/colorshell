#!/usr/bin/env bash

runtime_dir="${XDG_RUNTIME_DIR:-"/run/user/`id -u`"}/colorshell"
pidfile="$runtime_dir/.pid"
sock="$runtime_dir/.sock"


if [ -f $pidfile ] && ps -p `cat "$pidfile"` > /dev/null 2>&1; then

    if command -v socat > /dev/null 2>&1; then
        echo "$@" | socat - "$sock"
        exit ${?:-"0"}
    else
        echo "\e[33m[warn]\e[0m \`socat\` not installed, falling back to remote instance communication"
    fi
fi
