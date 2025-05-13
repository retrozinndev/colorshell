#!/usr/bin/env bash

selection=$(cliphist list | anyrun --plugins libstdin.so | cliphist decode)

if [[ ! -z "$selection" ]]; then
    printf "%s" "$selection" | sed -e 's/\\[n]$//g' | wl-copy
fi
