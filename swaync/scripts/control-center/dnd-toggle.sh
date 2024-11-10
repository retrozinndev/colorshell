#!/usr/bin/env bash

Update_state() {
    if [[ $(swaync-client -D) == true ]] 
    then
        echo true 
    else
        echo false
    fi
}

Toggle_state() {
    if [[ $SWAYNC_TOGGLE_STATE == true ]]
    then
       swaync-client -dn
    else
       swaync-client -df
    fi
}
