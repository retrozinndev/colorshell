#!/usr/bin/env bash

# display workspaces before checking for events
hyprctl -j workspaces | jq -c

handle() {
  case $1 in
    workspace*) hyprctl -j workspaces | jq -c ;;
  esac
}

socat -U - UNIX-CONNECT:$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock | while read -r line; do handle "$line"; done
