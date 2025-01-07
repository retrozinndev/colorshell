#!/usr/bin/env bash
set -e

dest="$HOME/Recordings"
if ! [[ $(xdg-user-dir VIDEOS) == "" ]]; then
    dest="$(xdg-user-dir VIDEOS)/Recordings"
fi
lock="$HOME/.cache/recording.lock"
pidfile="$HOME/.cache/recording.pid"
ext="mp4" # mp4,mkv...
filename=$(date +"%Y-%m-%d-%H%M%S_rec.$ext")

mkdir -p $dest

# run only if lockfile does not exist
if ! [[ -f $lock ]]; then
    touch $lock
    wf-recorder -f "$dest/$filename" &
    rec_pid=$!
    echo -e $rec_pid > $pidfile
    wait $rec_pid && (
        notify-send -a "Screen Recorder" "Recording Done" "The screen recording has been saved as '$dest/$filename'!"
        rm -f $lock $pidfile
    )
else
    notify-send -a "Screen Recorder" "Recording Error" "There's already an instance running! Mistake? Delete $lock and $pidfile."
    exit 1
fi
