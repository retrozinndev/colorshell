#!/usr/bin/bash

source ./utils.sh

set -e
trap "printf \"\nOk, quitting beacuse you entered an exit signal. (SIGINT).\n\"; exit 1" SIGINT
trap "printf \"\nOh noo!! Some application just told the script to end!\"; exit 2" SIGTERM

function Backup_previous_dotfiles {
    echo -n "Would you like to make a backup of the current dotfiles? [y/n] "
    read answer
    printf "\n"
    if [[ $answer =~ "y" ]]
    then 
        . ./backup-dots.sh
    else 
        echo "Ok! Directories will be overwritten, skipping backup :3"
    fi
}

function Apply_wallpapers {

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

for dir in ${config_dirs[@]}; do
    if ! [[ -d ./$dir ]]; then
        Send_log error "$dir is in fault, or you didn't run this script in its directory!"
        exit 1
    fi
done


# Start of actual script
Print_header

echo "Welcome to my dotfiles installation script!"

# Warn user of possible problems that can happen
echo "!!!WARNING!!! Running this may cause issues to your system if you don't know what you're doing! When continuing, you agree that any problem that may happen with the system is of your responsability!"

echo -n "Do you want to run the retrozinndev/Hyprland-Dots installer? [y/n] "
read input

if [[ $input =~ "y" ]]; then
    printf "\n"
    Backup_previous_dotfiles
	printf "\n"

	Send_log "Starting installation\n"

	for dir in ${config_dirs[@]}; do
        dest=$XDG_CONFIG_HOME/$dir

        echo "-> Installing $dir in $dest"
        mkdir -p $dest
        cp -rf ./$dir/* $dest
    done

    # Ask if user wants to apply repo's wallpapers dir
    Apply_wallpapers

    echo "Ah yes! Looks like it's ready to use, yay :3"
    echo -e "If you find any issue, please report it in:    
    https://github.com/retrozinndev/Hyprland-Dots/issues"
	echo "Thanks for using my Hyprland-Dots! I'm really happy about that :3"
    printf "\n"
else
    printf "Ok, doing as you said! Bye bye!\n"
	exit 0
fi
