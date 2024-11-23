#!/usr/bin/env bash

ACTIVE_WINDOW=$(hyprctl -j activewindow)
WINDOW_TITLE=$(echo $ACTIVE_WINDOW | jq '.title' | sed -e 's/^\"//' -e 's/\"$//')
WINDOW_CLASS=$(echo $ACTIVE_WINDOW | jq '.class' | sed -e 's/^\"//' -e 's/\"$//')

if ! [[ $WINDOW_CLASS == "null" ]]; then
    echo "$WINDOW_CLASS: $WINDOW_TITLE"
    eww update widget_window_visible=true
else
    echo ""
    eww update widget_window_visible=false
fi
