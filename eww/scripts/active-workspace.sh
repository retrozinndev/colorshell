#!/usr/bin/env

hyprctl -j activeworkspace | jq -c

handle() {
  case $1 in
    workspace*) hyprctl -j activeworkspace | jq -c ;;
  esac
}

socat -U - UNIX-CONNECT:$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock | while read -r line; do handle "$line"; done
