#!/usr/bin/env bash

Update_state() {
    if [[ $(nmcli n c) =~ "partial" ]] || [[ $(nmcli n c) =~ "full" ]]
    then
        echo true
    else
        echo false
    fi
}

Toggle_state() {
    if [[ $SWAYNC_TOGGLE_STATE == true ]]
    then
        nmcli n on
    else
        nmcli n off
    fi
}
