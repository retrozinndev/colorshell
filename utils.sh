#!/usr/bin/env bash

# This script contains useful functions to be used 
# in other scripts from retrozindev's dotfiles.
# ----------
# Made by retrozinndev (João Dias)
# Licensed under the MIT License
# From: https://github.com/retrozinndev/Hyprland-dots


# -------------
# Array containing directory names to be used by 
# retrozinndev/Hyprland-Dots install and update
# scripts.
# -------------
config_dirs=(
    "hypr" 
    "ags" 
    "kitty" 
    "anyrun" 
    "wal" 
    "fastfetch" 
)

# -------------
# Sends stdout log with type and message provided 
# in parameters.
# param $1 (optional) log type (err[or], warn[ing]), if not any of list, print as info
# param $2 log message
# -------------
function Send_log() {
    log_message=$2

    case ${1,,} in
        "^warn(ing)$")
            color="\e[33m"
            log_type="warning"
            ;;

        "^err(or)$")
            color="\e[31m"
            log_type="error"
            ;;

        *) 
            color="\e[34m"
            log_type="info"
            ;;
    esac

    if [[ -z $2 ]]; then
        log_message=$1
    fi

    echo -e "${color}[$log_type]\e[0m $log_message"
}

# -------------
# Prints retrozinndev/Hyprland-Dots installation 
# script's welcome header on stdout
# -------------
function Print_header() {
    printf "\n"
    echo "######################################"
    echo "## Retrozinndev's Hyprland Dotfiles ##"
    echo "######################################"
    printf "\n"
}
