#!/usr/bin/env bash

# Bash Script made by retrozinndev 
# Dotfiles: https://github.com/retrozinndev/Hyprland-Dots

# This script is not ready to use yet.

local REC_DIR="/tmp/screenRecording"
local REC_FILE="$REC_DIR/recording_swaync"

Update_state() {
    if [[ -f $REC_FILE ]]
    then
        echo true
    else
        echo false
    fi
}

Toggle_state() {
    if [[ $SWAYNC_TOGGLE_STATE == true ]]
    then
        Start_recording
    else
        Stop_recording
    fi
}

Start_recording() {
}

Stop_recording() {
}

Check_if_recording() {
}
