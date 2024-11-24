#!/usr/bin/env bash

# This script is made by retrozinndev (João Dias), It is licensed under
# the MIT License as in retrozinndev/Hyprland-Dots repository.
# GitHub: https://github.com/retrozinndev 
# Dotfiles: https://github.com/retrozinndev/Hyprland-Dots

# The script prompts the user with anyrun to choose an image file inside the defined
# $WALLPAPER_DIR, after user selected a file, it automatically writes it to the 
# hyprpaper.conf file and hot reloads if hyprpaper is running.


if [[ $WALLPAPER_DIR == "" ]]; then
    WALLPAPER_DIR="$HOME/wallpapers"
fi

HYPRPAPER_FILE="$HOME/.config/hypr/hyprpaper.conf"

WALLPAPER_SELECT_CMD="anyrun --plugins libstdin.so"

if [[ -z $(ls -A $WALLPAPER_DIR) ]]
then
    exit 1
fi

Update_wallpaper_settings() {
    echo "Writing to hyprpaper config file"

    echo "" > $HYPRPAPER_FILE # Cleans Hyprpaper conf

    echo "\$wallpaper = $SET_WALLPAPER_FULL" >> $HYPRPAPER_FILE
    echo "" >> $HYPRPAPER_FILE
    echo "splash = true" >> $HYPRPAPER_FILE
    echo "preload = \$wallpaper" >> $HYPRPAPER_FILE
    echo "wallpaper = , \$wallpaper" >> $HYPRPAPER_FILE
}

Hot_reload_wallpaper() {
    echo "Hot-reloading wallpaper"
    hyprctl hyprpaper unload all
    hyprctl hyprpaper preload "$SET_WALLPAPER_FULL"
    hyprctl hyprpaper wallpaper ", $SET_WALLPAPER_FULL"
}

Reload_pywal() {
    echo "Reloading pywal colorscheme"
    wal -q -s -t -i "$SET_WALLPAPER_FULL"
}

Reload_swaync() {
    echo "Reloading stylesheet for SwayNC"
    swaync-client -rs
}

Reload_eww() {
    echo "Reloading Eww..."
    eww reload
}

# Prompt wallpapers via dmenu
SET_WALLPAPER_NAME="$(ls $WALLPAPER_DIR | $WALLPAPER_SELECT_CMD)"
SET_WALLPAPER_FULL="$WALLPAPER_DIR/$SET_WALLPAPER_NAME"

echo "Wallpaper: $SET_WALLPAPER_NAME"

# Check if input wallpaper is empty
if [[ $SET_WALLPAPER_NAME == "" ]] || [[ $SET_WALLPAPER_NAME == " " ]]
then
    echo "No wallpaper has been selected by user!"
    if [ $RANDOM_WALLPAPER_WHEN_EMPTY = true ]
    then
        SET_WALLPAPER_NAME=$(ls $WALLPAPER_DIR | shuf -n 1)
        echo "Selected random wallpaper from $HOME/wallpapers: $SET_WALLPAPER_NAME"
        SET_WALLPAPER_FULL="$WALLPAPER_DIR/$SET_WALLPAPER_NAME"

    else
        echo "Skipping hyprpaper changes and exiting."
        exit 1
    fi
fi

Hot_reload_wallpaper
Reload_pywal
Reload_eww
Update_wallpaper_settings
Reload_swaync

exit 0
