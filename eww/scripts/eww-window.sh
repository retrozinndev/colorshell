#!/usr/bin/env bash

# arg1($1) should be one of the options listed in help command;
# arg2($2) should be the literal window name as defined in eww configuration.

function help_message() {
    printf \
"This is a helper script that helps opening/closing eww windows on 
retrozinndev's Hyprland Dots, by checking if the window is already 
open/closed before doing anything, also changes eww state variables.
This needs a variable like window_state_WINDOWNAME to work, where 
WINDOWNAME is the literal name of the declared window inside the 
eww configuration you are using. 

Usage:
                          arg1           arg2
    ./eww-window.sh [SINGLE OPTION] [WINDOW_NAME]

Options:
  -h, --help, help: Shows this help message;
  --open, open: Opens a window and changes its state variable to
                \"open\" if not open, or else does nothing;
  --toggle, toggle: Toggles a window. If open, the specified
                    window is closed, if closed, the 
                    specified window is open. Same thing goes to
                    the eww window state variable;
  --close, close: Closes a window and also changes its state 
                  variable to \"closed\" if open, or else does
                  nothing.


Developer: retrozinndev (João Dias), https://github.com/retrozinndev
Issue tracker: https://github.com/retrozinndev/Hyprland-Dots/issues
Licensed under the MIT License, as in retrozinndev's Hyprland-Dots repo."
}

function send_log() {
    case "$1" in
        err*)
            tag_color="\e[31m"
            ;;
        warn*)
            tag_color="\e[33m"
            ;;
        *)
            tag_color="\e[34m"
            ;;
    esac

    echo -e "[$tag_color$1\e[0m] $2"
}

function check_if_empty() {
    if [[ $1 == "" ]]; then
        send_log "error" "argument \$1 is empty!"
        help_message
        exit 1
    fi
}

function toggle_eww_window() {
    if ! [[ $(eww active-windows) =~ "$1" ]]; then
        eww open "$1"
        eww update "window_state_$1=open" 
    else 
        eww close "$1"
        eww update "window_state_$1=closed"
    fi
}

case "$1" in
    --help | -h | help | h)
        help_message
        ;;

    --open | open)
        check_if_empty $2 "WINDOW_NAME"
        if ! [[ $(eww active-windows) =~ "$2" ]]; then
            eww open "$2"
            eww update "window_state_$2=open"
        else
            send_log "info" "Window '$2' is already open, ignored."
        fi
        ;;

    --close | close)
        check_if_empty $2 "WINDOW_NAME"
        if [[ $(eww active-windows) =~ "$2" ]]; then
            eww close "$2"
            eww update "window_state_$2=closed"
        else
            send_log "info" "Window '$2' is already closed, ignored."
        fi
        ;;

    --toggle | toggle)
        check_if_empty $2 "WINDOW_NAME"
        toggle_eww_window $2
        ;;
    *)
        send_log "error" "Action not specified or incorrect command order. Good example: \`./eww-window.sh open bar\`"
        help_message
        ;;
esac
