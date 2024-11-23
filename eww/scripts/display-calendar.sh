#!/usr/bin/env bash

if [[ $(eww get calendar_state) == "show" ]]; then
    eww close calendar
    eww update calendar_state="hidden"
else
    eww open calendar
    eww update calendar_state="show"
fi
