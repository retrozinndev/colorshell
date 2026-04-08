#!/usr/bin/env bash

trap "printf \"\nOk, quitting beacuse you entered an exit signal. (SIGINT).\n\"; exit 1" SIGINT
trap "printf \"\nOh noo!! Some application just killed the script! (SIGTERM)\"; exit 2" SIGTERM

XDG_CACHE_HOME=${XDG_CACHE_HOME:-"$HOME/.cache"}

is_standalone=`(git remote -v > /dev/null 2>&1) || echo -n true`

temp_dir="$XDG_CACHE_HOME/colorshell-installer"
repo_directory=`[[ "$is_standalone" ]] && echo -n "$temp_dir/repo" || echo -n "."`


# check if the script is running in standalone mode(without having cloned the repo)
remotes=`git remote -v 2> /dev/null || echo -n ""`
remote_origin=`echo "$remotes" | head -n1 | awk -F "\t| " '{print $2}'`
if [ "$remotes" ] && [[ $remote_origin =~ colorshell\.git$ ]]; then
    is_standalone=
else
    is_standalone=true
fi


if [[ "$is_standalone" ]]; then
    branch=ryo
    url="https://raw.githubusercontent.com/\
retrozinndev/colorshell/refs/heads/$branch/install.sh"

    mkdir -p $temp_dir
    if ! (curl -s $url > $temp_dir/install.sh); then
        echo "[error] Failed to fetch installation script from the web. \
Please check your internet connection and try again ;)" > /dev/stderr

        rm -f $temp_dir/install.sh
        exit 1
    fi

    bash $temp_dir/install.sh -u
else
    bash $repo_directory/install.sh -u
fi
