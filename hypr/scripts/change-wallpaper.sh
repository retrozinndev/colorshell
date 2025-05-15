#!usr/bin/env bash

# Prompts the user with dmenu(or dmenu-like app, see hypr/scripts/get-dmenu.sh) 
# to choose an image file inside defined $WALLPAPERS_DIR. If the user selects 
# an entry, it automatically writes changes to the hyprpaper.conf file and 
# hot-reloads if hyprpaper is running.
# --------------
# Licensed under the MIT License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/colorshell

style="lighten" # lighten / darken
dmenu=$(sh "$XDG_CONFIG_HOME/hypr/scripts/get-dmenu.sh")

if [[ -z "$WALLPAPERS_DIR" ]]; then
    WALLPAPERS_DIR="$HOME/wallpapers"
fi

function Write_changes() {
    echo "[LOG] Writing to hyprpaper config file"

    echo \
'$wallpaper'" = $wall

splash = true
preload = "'$wallpaper'"
wallpaper = , "'$wallpaper'"" | sed -e "s/^(\\[n])//g" > $XDG_CONFIG_HOME/hypr/hyprpaper.conf
}

function Reload_wallpaper() {
    echo "[LOG] Hot-reloading wallpaper"
    hyprctl hyprpaper unload all
    hyprctl hyprpaper preload $wall
    hyprctl hyprpaper wallpaper ", $wall"
}

function Reload_pywal() {
    echo "[LOG] Reloading pywal colorscheme"
    wal -t --cols16 $style -i "$wall"
}

if [[ -z "$dmenu" ]]; then
    notify-send -u normal -a "Wallpaper" "Dmenu not found" "Couldn't find anyrun or wofi for dmenu! Try installing one of these two before selecting wallpaper!"
    exit 1
fi

if [[ -z $(ls -A $WALLPAPERS_DIR) ]]; then
    notify-send -u normal -a "Wallpaper" "Wallpapers not found" "Couldn't find any wallpaper inside \`~/wallpapers\`, try putting an image you like in there to choose it!"
    exit 1
fi

if [[ -z $1 ]]; then 
    # Prompt wallpaper list
    wall="$WALLPAPERS_DIR/$(ls $WALLPAPERS_DIR | $dmenu)"

    # Check if input wallpaper is empty
    if [[ $wall == "$WALLPAPERS_DIR/" ]]; then
        echo "No wallpaper has been selected by user!"
        if [[ $RANDOM_WALLPAPER_WHEN_EMPTY == true ]]; then
            wall="$WALLPAPERS_DIR/$(ls $WALLPAPERS_DIR | shuf -n 1)"
            echo "Selected random from $WALLPAPERS_DIR: $wall"
        else
            echo "Skipping hyprpaper changes and exiting."
            exit 0
        fi
    fi
else
    wall=$1
fi

Reload_pywal
Reload_wallpaper
Write_changes

exit 0
