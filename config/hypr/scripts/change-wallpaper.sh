#!usr/bin/env bash

# Prompts the user with dmenu(or dmenu-like app, see hypr/scripts/get-dmenu.sh) 
# to choose an image file inside defined $WALLPAPERS. If the user selects 
# an entry, it automatically writes changes to the hyprpaper.conf file and 
# hot-reloads if hyprpaper is running.
# --------------
# Licensed under the BSD 3-Clause License
# Made by retrozinndev (João Dias)
# From https://github.com/retrozinndev/colorshell

style="lighten" # lighten / darken
WALLPAPERS=`[[ -z "$WALLPAPERS" ]] && echo -n "$HOME/wallpapers" || echo -n "$WALLPAPERS"`

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

if [[ -z $(ls -A -w1 $WALLPAPERS) ]]; then
    notify-send -u normal -a "Wallpaper" "Wallpapers not found" "Couldn't find any wallpaper inside \`~/wallpapers\`, try putting an image you like in there to choose it!"
    exit 1
fi

if [[ -z $@ ]]; then 
    # Prompt wallpaper list
    selection=`ls -w1 "$WALLPAPERS" | wofi --show drun`

    # Check if input wallpaper is empty
    if [[ -z $selection ]]; then
        echo "No wallpaper has been selected by user!"
        if [[ $RANDOM_WALLPAPER_WHEN_EMPTY == true ]]; then
            wall="$WALLPAPERS/$(ls $WALLPAPERS | shuf -n 1)"
            echo "Selected random from $WALLPAPERS: $wall"
        else
            echo "Skipping hyprpaper changes and exiting."
            exit 0
        fi
    else
        wall="$WALLPAPERS/$selection" # wofi if no wallpaper specified
    fi
else
    wall=$@
fi

Reload_pywal
Reload_wallpaper
Write_changes

exit 0
