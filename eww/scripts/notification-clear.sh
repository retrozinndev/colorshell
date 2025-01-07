#!/usr/bin/env bash

lockfile=$HOME/.cache/notification-history.lock
json_history_file=$HOME/.cache/notification-history.json

if ! [[ -f $lockfile ]]; then
    echo "{ \"history\": [] }" > $json_history_file
fi
