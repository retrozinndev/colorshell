#!/usr/bin/bash

set -e
source ./scripts/utils.sh

trap "printf \"\nOk, quitting beacuse you entered an exit signal. (SIGINT).\n\"; exit 1" SIGINT
trap "printf \"\nOh noo!! Some application just killed the script!\"; exit 2" SIGTERM

BIN_HOME=`[[ ! "$BIN_HOME" ]] && echo -n "$BIN_HOME" || echo -n "$HOME/.local/bin"`
XDG_DATA_HOME=`[[ ! "$XDG_DATA_HOME" ]] && echo -n "$XDG_DATA_HOME" || echo -n "$HOME/.local/share"`
XDG_CONFIG_HOME=`[[ ! "$XDG_CONFIG_HOME" ]] && echo -n "$XDG_CONFIG_HOME" || echo -n "$HOME/.config"`

#####

Print_header
echo -e "Colorshell is a project made by retrozinndev. 
Source: https://github.com/retrozinndev/colorshell\n"

sleep .5

echo "Welcome to the colorshell installation script!"

# Warn user of possible problems that can happen
Send_log warn "!! By running this script, you assume total responsability for any issues that may occur with your filesystem"

echo -n "Do you want to start the shell installation? [y/n] "
[[ ! $1 == "dots" ]] && read input || printf "\n"

if [[ $1 == "dots" ]] || [[ $input =~ "y" ]]; then
    Send_log "Starting installation...\n"

    Send_log "Installing default configurations"
    for dir in $(ls -A -w1 ./config); do
        dest=$XDG_CONFIG_HOME/$dir

        echo "-> Installing $dir in $dest"
        mkdir -p "$dest" # create parents

        if [[ -f "./$dir" ]]; then
            rm -r "$dest" # delete unused directory
            cp -f ./$dir "$dest" # copy actual file
        else
            cp -rf ./$dir/* "$dest" # force-copy content
        fi
    done

    Send_log "Building colorshell..."
    pnpm build:release

    Send_log "Installing colorshell"
    # install shell
    mkdir -p $BIN_HOME
    cp -f ./build/release/colorshell $BIN_HOME

    # install gresouce
    mkdir -p $XDG_DATA_HOME/colorshell
    cp -f ./build/release/resources.gresource $XDG_DATA_HOME/colorshell
    Send_log "Cleaning"
    pnpm clean

    if ! [[ $1 == "dots" ]]; then
        echo "Colorshell is installed! :D"
        sleep .8
        echo "If you have issues, please report it!"
        echo "Issue Tracker: https://github.com/retrozinndev/colorshell/issues"
        sleep .5
        echo "Thanks for using colorshell! I really appreciate that :P"
        printf "\n"

        exit 0
    fi

    Send_log "Colorshell is installed!"
    exit 0
fi

printf "Ok, doing as you said! Bye bye!\n"
exit 0
