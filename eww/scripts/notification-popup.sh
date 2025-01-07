#!/usr/bin/env bash

# This scripts receives a notification from arg1,
# in a json format, displays in eww, counting 
# down depending on notification urgency and 
# removes the notification from json.

# Timeout in seconds
# When set to 0, notification will disappear 
# only when hovering it.
timeout_low=3
timeout_normal=6
timeout_critical=0

if ! [[ $@ == "" ]]; then
    # Urgency levels:
    # Low: 0, Normal: 1, Critical: 2
    urgency=$(echo $@ | jq -c ".urgency.data")
    id=$(echo $@ | jq -c ".id.data") 
    json_popup_notifications="$(eww get json_popup_notifications)"
    json_notification=$(echo $@ | jq -c '.')

    if [[ $json_popup_notifications == "" ]]; then
        eww update "json_popup_notifications="'{"notifications":[]}' >> /dev/null
        json_popup_notifications='{"notifications":[]}'
    fi

    eww update "json_popup_notifications=$(echo $json_popup_notifications | jq -c ".notifications |= [$json_notification] + .")" >> /dev/null
    sh $HOME/.config/eww/scripts/eww-window.sh open floating-notifications >> /dev/null

    # Critical urgency is handled by eww, no need to count down
    case $urgency in
        0*)
            sleep $timeout_low
            ;;
        1*)
            sleep $timeout_normal
            ;;
    esac

    if ! [[ $urgency == 2 ]]; then
        sh $HOME/.config/eww/scripts/notification-popup-remove.sh "$id" &
    fi
fi


exit 0
