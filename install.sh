#!/usr/bin/env bash

set -e

trap "printf \"\nOk, quitting beacuse you entered an exit signal. (SIGINT).\n\"; exit 1" SIGINT
trap "printf \"\nOh noo!! Some application just killed the script! (SIGTERM)\"; exit 2" SIGTERM

XDG_CONFIG_HOME=`[[ ! -z "$XDG_CONFIG_HOME" ]] && echo $XDG_CONFIG_HOME || echo $HOME/.config`
XDG_CACHE_HOME=`[[ ! -z "$XDG_CACHE_HOME" ]] && echo $XDG_CACHE_HOME || echo $HOME/.cache`

skip_prompts=`[[ "$@" =~ "\-y" ]] && echo -n true`
is_standalone=`[[ $(git remote -v > /dev/null) ]] && remote=\`git remote -v | head -n 1 \
    | awk '{print $2}' | sed 's/.git$//g'\` echo -n $remote || echo -n`
temp_dir="$XDG_CACHE_HOME/colorshell-installer"
repo_directory=`$is_standalone && echo "$temp_dir/repo" || echo "."`


# source utils script before installation
if $is_standalone; then
    mkdir -p $temp_dir
    # testing only, change to commented value before merging (hope I don't forget lol)
    default_branch="standalone-installer" # `curl -s https://api.github.com/repos/retrozinndev/colorshell | jq -r .default_branch`
    # get utils script
    curl -s https://raw.githubusercontent.com/retrozinndev/colorshell/refs/heads/$default_branch/utils.sh > $temp_dir/utils.sh
    source $temp_dir/utils.sh
else
    source ./utils.sh
fi

function Apply_wallpapers() {
    Ask "Would you also like to apply the wallpapers folder? :3"

    if $answer == "y"; then
        echo "Thanks for choosing! Please remember that I am not the author of the wallpapers!"
        echo "You can see sources in the repo: https://github.com/retrozinndev/colorshell/WALLPAPERS.md"
 
        echo "-> Copying wallpapers to ~/wallpapers"
        mkdir -p $HOME/wallpapers
        cp -f ./wallpapers/* $HOME/wallpapers
    else
        echo "Ok! The wallpaper is yours to choose!"
        echo "Expect some Hyprland source and color errors, it happens because there aren't colors to source when you don't install wallpapers right away, so you have to do it yourself."
        echo "Tip: create the ~/wallpapers directory, put your wallpapers there and press ´SUPER + W´ to select :3"
    fi
}

#########
# Start #
#########

# makes bash force-load the script into memory to avoid issues when 
# switching source to a tag
{
Print_header
echo -e "Colorshell is a project made by retrozinndev.\nhttps://github.com/retrozinndev/colorshell\n"
sleep .5

echo "Welcome to the colorshell installation script!"

# Warn user of possible problems that can happen
Send_log warn "!! By running this script, you assume total responsability for any issues that may occur with your filesystem"

[[ ! $skip_prompts ]] && Ask "Do you want to start the shell installation?"

if $is_standalone; then
    Send_log "installer noticed that you don't have a local clone of colorshell yet"
    rm -rf $repo_directory 2> /dev/null
    Send_log "cloning repository in \`$repo_directory\`..."
    git clone https://github.com/retrozinndev/colorshell.git $repo_directory
else 
    Send_log "installer detected that you're running the script from a local clone"
fi

if [[ $skip_prompts ]] || [[ $answer == "y" ]]; then
    Ask "Nice! Use the stable version instead of the unstable(git)?"

    if [[ ! $1 == "dots" ]] && [[ $answer == "y" ]]; then
        Send_log "fetching latest release from colorshell repository"
        latest_tag=`curl -s "$repo_api_url/releases" | jq -r '. | select(.[].prerelease == false) | .[0].tag_name'`
        
        Send_log "done fetching"
        Send_log "checking out latest non-pre-release version: $latest_tag"
        git -C $repo_directory checkout $latest_tag 1> /dev/null
    fi

    Send_log "starting colorshell installation"

    for dir in ${config_dirs[@]}; do
        dest=$XDG_CONFIG_HOME/$dir

        echo "-> Installing $dir in $dest"
        mkdir -p "$dest" # create parents

        if [[ -f "$repo_directory/$dir" ]]; then
            rm -rf "$dest" # delete unused directory
            cp -f $repo_directory/$dir "$dest" # copy actual file
        else
            cp -rf $repo_directory/$dir/* "$dest" # force-copy content
        fi
    done

    echo "-> Copying default user config"
    cp -rf $repo_directory/hypr/user $XDG_CONFIG_HOME/hypr

    echo "-> Copying default hyprpaper.conf"
    cp -f $repo_directory/hypr/hyprpaper.conf $XDG_CONFIG_HOME/hypr

    # Ask if user also wants to install default wallpapers
    Apply_wallpapers

    if ! [[ $1 == "dots" ]]; then
        echo "Ah yes! Looks like it's installed, yay :3"; sleep .8
        echo "If you find any issue, please report it in: https://github.com/retrozinndev/colorshell/issues"; sleep .5
        echo "Thanks for using colorshell! I really appreciate that :D"
        printf "\n"

        exit 0
    fi

    Send_log "colorshell is installed!"

    exit 0
fi

printf "Ok, doing as you said! Bye bye!\n"
exit
}
