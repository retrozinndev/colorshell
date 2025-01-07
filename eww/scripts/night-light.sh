#!/usr/bin/env bash
set -e

pidfile="$HOME/.cache/night-light.pid"
temperature=4500 # in K

# run only if pid file does not exist
if ! [[ -f $pidfile ]]; then
    touch $pidfile
    hyprsunset -t $temperature &
    _pid=$!
    echo -e $_pid > $pidfile
    wait $_pid && rm -f $pidfile
else
    echo "There's already an instance running! Mistake? Delete \"~/.cache/night-light.pid\"."
    exit 1
fi
