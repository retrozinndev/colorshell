#!/usr/bin/env bash

# This script backups current configuration dirs
# listed in utils.sh script.
# --------
# Made by retrozinndev (João Dias)
# Licensed under the MIT License
# From: https://github.com/retrozinndev/Hyprland-Dots

source ./utils.sh


bkp_dir="$HOME/hyprland-dots-bkp"

Send_log "Creating backup in $bkp_dir"

if [[ -d $bkp_dir ]]
then
    Send_log "Found existing backup in $bkp_dir!"
    echo "Looks like the backup directory already exists!"
    echo -n "Would you like to move it to trash/override it? [y/n] "
    read answer
    
    if [[ $answer =~ "y" ]]; then
        echo "Fine! Previous backup is goning to be moved to trash"
        trash-put $bkp_dir
    else 
        echo "Ok! Quitting doing backup because it already exists"
        exit 1
    fi
fi

# Make backup of existing configurations
for dir in ${config_dirs[@]}; do
    if [[ -d "$CONFIG_DIR/$dir" ]]
    then
        echo "-> backuping $dir"
        cp -r "$CONFIG_DIR/$dir" $DOTFILES_BACKUP_DIR
    else
        echo "[info] $dir backup was skipped, because it wasn't found."
    fi
done

echo "Finished backup!!"
