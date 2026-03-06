#!/usr/bin/env bash

_runtime_dir="${XDG_RUNTIME_DIR:-"/run/user/`id -u`"}"
_pidfile="$_runtime_dir/colorshell/.pid"
_sock="$_runtime_dir/colorshell/.sock"


if [ -f $_pidfile ] && ps -p `cat "$_pidfile"` > /dev/null 2>&1; then

    if command -v socat > /dev/null 2>&1; then
        echo "$@" | socat - "$_sock"
        exit ${?:-"0"}
    else
        echo "\e[33m[warn]\e[0m \`socat\` not installed, falling back to remote instance communication"
    fi
fi
