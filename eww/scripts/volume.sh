#!/usr/bin/env bash

# Note: $SCROLL is defined by eww

DEFAULT_INCREASE='5'

Guess_increase_decrease() {
    CURRENT_VOL=$(Translate_volume_to_int)

    if [[ $SCROLL == "up" ]]; then
        if [[ $(awk "BEGIN { ($CURRENT_VOL+$DEFAULT_INCREASE) }") > 100 ]]; then
            echo "1.00"
        else
            echo "$DEFAULT_INCREASE%+"
        fi
    else
        echo "$DEFAULT_INCREASE%-"
    fi
}

Update_volume() {
    UPDATED_VOL=$(Guess_increase_decrease)
    wpctl set-volume "@DEFAULT_AUDIO_SINK@" "$UPDATED_VOL"
}

Translate_volume_to_int() {
    echo $(wpctl get-volume @DEFAULT_AUDIO_SINK@ | sed -e 's/Volume: //' -e 's/^1\./1/' -e 's/^0.//' -e 's/^00/0/')
}
