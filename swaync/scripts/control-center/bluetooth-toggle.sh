#!/usr/bin/env bash

Update_state() {
    if [[ $(bluetoothctl show | grep "Powered" | sed "s/Powered: //" | xargs) == "yes" ]]
    then
        echo true
    else
        echo false
    fi
}

Toggle_state() {
    if [[ $SWAYNC_TOGGLE_STATE == "true" ]]
    then
        bluetoothctl power on
    else
        bluetoothctl power off
    fi
}
