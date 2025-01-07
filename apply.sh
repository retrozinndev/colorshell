#!/usr/bin/bash

set -e
trap "printf \"\nOk! Quitting beacuse you entered an exit signal.\n\"; exit 1" SIGINT

printf "\n"
echo "######################################"
echo "## Retrozinndev's Hyprland Dotfiles ##"
echo "######################################"
printf "\n"

CONFIG_DIR="$HOME/.config"
DOTFILES_DIRS=("hypr" "eww" "kitty" "anyrun" "wal" "fastfetch" "mako")
DOTFILES_BACKUP_DIR="$HOME/hyprland-dotfiles-bkp"

echo "Welcome to my dotfiles installation script!"

# Warn user of possible problems that can happen
echo "WARN! Running this script may cause problems with your system. When continuing, you're confirming that any problem that may happen with your system is of **your** responsability."

function Backup_previous_dotfiles {
    echo -n "Would you like to make a backup of the current dotfiles? [y/n] "
    read make_backup_answer
    printf "\n"
    if [[ $make_backup_answer =~ "y" ]]
    then
        echo "[info] Creating backup dir in $DOTFILES_BACKUP_DIR"
        
        if [[ -d $DOTFILES_BACKUP_DIR ]]
        then
            echo "Looks like the backup directory already exists!"
            echo -n "Would you like to override it with the current configuration? (Will be moved to trash) [y/n] "
            read override_backup
            
            if [[ $override_backup = "y" ]] || [[ $override_backup = "yes" ]]
            then
                echo "Ok! The backup folder will be ovewritten with the current user configuration."
                trash-put $DOTFILES_BACKUP_DIR
            fi
        else
            mkdir $DOTFILES_BACKUP_DIR
        fi
        
        # Make backup of existing configurations
        for dir in ${DOTFILES_DIRS[@]}; do
            if [[ -d "$CONFIG_DIR/$dir" ]]
            then
                echo "-> Making backup of $dir"
                cp -r "$CONFIG_DIR/$dir" $DOTFILES_BACKUP_DIR
            else
                echo "[info] $dir backup was skipped, because it wasn't found."
            fi
        done

        echo "Finished backup!!" 

    else 
        echo "Fine! Current settings will be overwritten, skipping backup :D"

    fi
}

function Apply_wallpapers {

    echo -n "Would you also like to apply the wallpapers folder? :3 [y/n] "
    read input_wallpaper
    printf "\n"

    if [[ $input_wallpaper =~ "y" ]]
    then
        echo "Thanks for installing these wallpapers! Oh, remember that I am not the author of them!"
        echo "You can see sources in the repo: https://github.com/retrozinndev/Hyprland-Dots/WALLPAPERS.md"
 
        echo "-> Copying wallpapers to ~/wallpapers"
        mkdir -p $HOME/wallpapers
        cp -f ./wallpapers/* $HOME/wallpapers
    else
        echo "Ok! The wallpaper is yours to choose!"
        echo "Tip: create a directory named \"wallpapers/\" on your home dir, put your wallpapers there and press ´SUPER + W´ to select any of them :3"
    fi
}

function Apply_dotfiles {
	
	printf "\n"
    Backup_previous_dotfiles
	printf "\n"

	printf "Starting dotfiles installation...\n"

	for dir in ${DOTFILES_DIRS[@]}; do
        echo "-> Installing $dir in $CONFIG_DIR/$dir"
        mkdir -p $CONFIG_DIR/$dir
        cp -rf ./$dir/* $CONFIG_DIR/$dir
    done

    # Ask if user wants to apply repo's wallpapers dir
    Apply_wallpapers

    echo "Ah yes! Looks like it's ready to use, yay :3"
    echo "If you find any issue, please report at: https://github.com/retrozinndev/Hyprland-Dots/issues"
	echo "Thanks for using my dotfiles! I'm really happy about that :3"
    printf "\n"
}

for dir in ${DOTFILES_DIRS[@]}; do
    if ! [[ -d ./$dir ]]; then
        echo "[error] Looks like $dir configuration is in fault, or you didn't run this script in its directory!"
        echo "[tip] If directory doesn't exist, try cloning the dotfiles again."
        exit 1
    fi
done

echo -n "Do you want to install the dotfiles? [y/n] "
read input

if [[ $input =~ "y" ]]
then
	Apply_dotfiles
else
    printf "Ok, doing as you said! Bye bye!\n"
	exit 0
fi

printf "\n"


