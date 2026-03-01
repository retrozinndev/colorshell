#!/usr/bin/env bash

_pidfile=${XDG_RUNTIME_DIR:-"/run/user/`id -u`"}/colorshell/.pid

if [[ -f $_pidfile ]] && ps -p `cat "$_pidfile"` > /dev/null; then

    if command -v socat > /dev/null 2>&1; then
        echo "$@" | socat - "${XDG_RUNTIME_DIR:-"/run/user/$(id -u)"}/colorshell/.sock"
        exit ${?:-"0"}
    else
        echo "\e[33m[warn]\e[0m \`socat\` not installed, falling back to remote instance communication"
    fi
fi
