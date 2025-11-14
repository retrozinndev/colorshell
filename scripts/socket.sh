#!/usr/bin/env bash

if gdbus introspect --session \
  --dest io.github.retrozinndev.colorshell \
  --object-path /io/github/retrozinndev/colorshell > /dev/null 2>&1; then

    if command -v socat > /dev/null 2>&1; then
        echo "$@" | socat - "${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/colorshell.sock"
        exit 0
    else
        echo "[warn] \`socat\` not installed, falling back to remote instance communication"
    fi
fi
