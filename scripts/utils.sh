#!/usr/bin/env bash

# This script contains useful functions to be used 
# in other scripts from colorshell.
# ----------
# Made by retrozinndev (João Dias)
# Licensed under the MIT License
# From: https://github.com/retrozinndev/colorshell


# -------------
# The repository's api url
# -------------
repo_api_url=https://api.github.com/repos/retrozinndev/colorshell

# -------------
# Sends stdout log with type and message provided 
# in parameters.
# param $1 (optional) log type (err[or], warn[ing]), if not any of list, print as info
# param $2 log message
# -------------
function Send_log() {
    log_message=`[[ -z $2 ]] && echo $1 || echo $2`
    color="\e[34m"
    log_type="info"

    case "${1,,}" in
        warn)
            color="\e[33m"
            log_type="warning"
            ;;

        err)
            color="\e[31m"
            log_type="error"
            ;;
    esac

    echo -e "${color}[$log_type]\e[0m $log_message"
}

# -------------
# Prints retrozinndev/colorshell installation 
# script's welcome header on stdout
# -------------
function Print_header() {
    printf "\n"
    echo "#############################"
    echo "## Colorshell Installation ##"
    echo "#############################"
    printf "\n"
}

# -------------
# Ask a yes/no question to user
# Input answer is exported as $answer
# -------------
function Ask() {
    read -n 1 -p "$1 [y/n] " r
    printf '\n'
    export answer=$r
}

# -------------
# Ask a yes/no question to user
# Input answer is exported as $answer
# (this function is not done yet)
# -------------
function Choose() {
    read -n 1 -p "$1 [y/n] " r
    printf '\n'
    export answer=$r
}
