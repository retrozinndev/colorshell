#!/usr/bin/env bash

cliphist list | anyrun --plugins libstdin.so | read pipe

if [[ ! -z "$pipe" ]]; then 
    echo $pipe | cliphist decode | wl-copy
fi
