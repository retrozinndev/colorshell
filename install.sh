#!/usr/bin/bash

source ./utils.sh

set -e
trap "printf \"\nOk, quitting beacuse you entered an exit signal. (SIGINT).\n\"; exit 1" SIGINT
trap "printf \"\nOh noo!! Some application just killed the script!\"; exit 2" SIGTERM

XDG_CONFIG_HOME=$(sh -c '[[ ! -z "$XDG_CONFIG_HOME" ]] && echo "$XDG_CONFIG_HOME" || echo "$HOME/.config"')

function Apply_wallpapers() {
    echo -n "Would you also like to apply the wallpapers folder? :3 [y/n] "
    read answer
    printf "\n"

    if [[ $answer =~ "y" ]]; then
        echo "Thanks for choosing! Please remember that I am not the author of the wallpapers!"
        echo "You can see sources in the repo: https://github.com/retrozinndev/Hyprland-Dots/WALLPAPERS.md"
 
        echo "-> Copying wallpapers to ~/wallpapers"
        mkdir -p $HOME/wallpapers
        cp -f ./wallpapers/* $HOME/wallpapers
    else
        echo "Ok! The wallpaper is yours to choose!"
        echo "Tip: create a directory named \"wallpapers/\" on your home dir, put your wallpapers there and press ´SUPER + W´ to select any of them :3"
    fi
}

#########
# Start #
#########

Print_header
echo -e "colorshell is a project made by retrozinndev. source: https://github.com/retrozinndev/colorshell\n"
sleep .5

echo "Welcome to the colorshell installation script!"

# Warn user of possible problems that can happen
echo "!!!WARNING!!! By running this script, you assume total responsability for any issues that may occur with your filesystem"

echo -n "Do you want to start the shell installation? [y/n] "
[[ ! $1 == "dots" ]] && read input || printf "\n"

if [[ $1 == "dots" ]] || [[ $input =~ "y" ]]; then
	Send_log "Starting installation...\n"

	for dir in ${config_dirs[@]}; do
        dest=$XDG_CONFIG_HOME/$dir

        echo "-> Installing $dir in $dest"
        mkdir -p "$dest" # create parents

        if [[ -f "./$dir" ]]; then
            rm -f "$dest" # delete unused directory
            cp -f "./$dir" "$dest" # copy actual file
        else
            cp -rf "./$dir/*" "$dest" # force-copy content
        fi
    done

    # Ask if user also wants to install default wallpapers
    Apply_wallpapers

    if ! [[ $1 == "dots" ]]; then
        echo "Ah yes! Looks like it's installed, yay :3"; sleep .8
        echo "If you find any issue, please report it in: https://github.com/retrozinndev/colorshell/issues"; sleep .5
        echo "Thanks for using colorshell! I'm really appreciate that :D"
        printf "\n"

        exit 0
    fi

    Send_log "colorshell is installed!"

    exit 0
fi

printf "Ok, doing as you said! Bye bye!\n"
exit 0
