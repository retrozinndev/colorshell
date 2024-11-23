#!/usr/bin/env bash

# Note: $SCROLL is defined by eww

$DEFAULT_INCREASE='5'

Guess_increase_decrease() {
    local $CURRENT_VOL=$(wpctl get-volume "@DEFAULT_AUDIO_SINK@")
}

Update_volume() {
    local $UPDATED_VOL=$(Guess_increase_decrease)
    wpctl set-volume "@DEFAULT_AUDIO_SINK@" "$UPDATED_VOL"
}

Translate_volume_to_int() {
    echo $(wpctl get-volume "@DEFAULT_AUDIO_SINK@" | sed -e "s/^Volume: //" -e "s/^1.//1")
}
