#!/usr/bin/env bash

trap "printf \"\nOk, quitting beacuse you entered an exit signal. (SIGINT).\n\"; exit 1" SIGINT
trap "printf \"\nOh noo!! Some application just killed the script! (SIGTERM)\"; exit 2" SIGTERM

XDG_DATA_HOME=`[[ -z "$XDG_DATA_HOME" ]] && echo -n "$HOME/.local/share" || echo -n "$XDG_DATA_HOME"`
XDG_CACHE_HOME=`[[ -z "$XDG_CACHE_HOME" ]] && echo -n $HOME/.cache || echo -n $XDG_CACHE_HOME`
XDG_CONFIG_HOME=`[[ -z "$XDG_CONFIG_HOME" ]] && echo -n "$HOME/.config" || echo -n "$XDG_CONFIG_HOME"`
BIN_HOME=`[[ -z "$BIN_HOME" ]] && echo -n "$HOME/.local/bin" || echo -n "$BIN_HOME"`
APPS_HOME=`[[ -z "$APPS_HOME" ]] && echo -n "$XDG_DATA_HOME/applications" || echo -n "$APPS_HOME"`

skip_prompts=`[[ "$1" == -y ]] && echo -n true`
is_standalone=`(git remote -v > /dev/null 2>&1) || echo -n true`

temp_dir="$XDG_CACHE_HOME/colorshell-installer"
repo_directory=`[[ "$is_standalone" ]] && echo -n "$temp_dir/repo" || echo -n "."`


# source utils script before installation
if [[ "$is_standalone" ]]; then
    mkdir -p "$repo_directory"
    default_branch="ryo" # `curl -s https://api.github.com/repos/retrozinndev/colorshell | jq -r .default_branch`
    # get utils script
    echo "fetching utils script..."
    curl -s https://raw.githubusercontent.com/retrozinndev/colorshell/refs/heads/$default_branch/scripts/utils.sh > $temp_dir/utils.sh
    source $temp_dir/utils.sh
else
    source ./scripts/utils.sh
fi


#########
# Start #
#########

# makes bash force-load the script into memory to avoid issues when 
# switching source to a tag

{
Print_header
echo -e "Colorshell is a project made by retrozinndev. 
Source: https://github.com/retrozinndev/colorshell\n"
sleep .5

echo "Welcome to the colorshell installation script!"

# Warn user of possible issues
Send_log warn "!! By running this script, you assume total responsability for any issues that may occur with your filesystem"

[[ -z $skip_prompts ]] && \
    Send_log warn "Your current Hyprland and kitty configuration will be overwritten, accept the backup prompt if you still want them"

[[ -z $skip_prompts ]] && \
    Ask "Do you want to backup what is going to be modified/overwritten?"

[[ $answer == y ]] || [[ $skip_prompts ]] && \
    Backup_config $repo_directory

[[ -z "$skip_prompts" ]] && \
    Ask "Do you want to start the shell installation?"

if [[ "$answer" == y ]] || [[ "$skip_prompts" ]]; then
    if [[ "$is_standalone" ]]; then
        Send_log "The installer noticed that you're calling the script remotely"
        rm -rf $repo_directory 2> /dev/null
        Send_log "Cloning repository in \`$repo_directory\`..."
        if [[ -d $repo_directory/.git ]]; then
            Send_log "repo is already cloned! let's just fetch the latest changes..."
            git -C "$repo_directory" stash # if there are changes, let's just stash them
            git -C "$repo_directory" checkout ryo
            git -C "$repo_directory" fetch && git -C "$repo_directory" pull --rebase
        else
            git clone https://github.com/retrozinndev/colorshell.git "$repo_directory"
        fi
    fi

    Ask "Nice! Do you want to use the stable version instead of the unstable(latest commit)?"

    if [[ -z "$skip_prompts" ]] && [[ "$answer" == y ]]; then
        Send_log "fetching latest release from colorshell repository"
        latest_tag=`curl -s "$repo_api_url/releases" | jq -r '. | select(.[].prerelease == false) | .[0].tag_name'`
        
        Send_log "Done fetching"
        Send_log "Checking out latest non-pre-release version: $latest_tag"
        git -C "$repo_directory" checkout $latest_tag > /dev/null 2>&1
    fi

    Send_log "Starting installation..."

    Send_log "Installing default configurations"
    for dir in $(ls -A -w1 "$repo_directory/config"); do
        dest=$XDG_CONFIG_HOME/$dir

        Send_log "Installing $dir in $dest"
        mkdir -p `dirname "$dest"` # create parents

        [[ -d "$dest" ]] || [[ -f "$dest" ]] && \
            rm -rf $dest

        cp -rf $repo_directory/config/$dir "$dest" # copy
    done

    Send_log "Updating dependencies"
    pnpm -C "$repo_directory" i && pnpm -C "$repo_directory" update

    Send_log "Building colorshell"
    pnpm -C "$repo_directory" build:release

    Send_log "Installing colorshell"
    # install shell
    mkdir -p $BIN_HOME
    cp -f $repo_directory/build/release/colorshell $BIN_HOME

    # install gresource
    mkdir -p $XDG_DATA_HOME/colorshell
    cp -f $repo_directory/build/release/resources.gresource $XDG_DATA_HOME/colorshell

    # install desktop entry
    mkdir -p $APPS_HOME
    cp -f $repo_directory/build/release/colorshell.desktop $APPS_HOME


    Send_log "Adding default wallpaper in ~/wallpapers"
    mkdir -p $HOME/wallpapers
    cp -f $repo_directory/resources/wallpaper_default.jpg "$HOME/wallpapers/Default Hypr-chan.jpg"

    if [[ -z "$skip_prompts" ]]; then
        echo "Colorshell is installed! :D"
        sleep .8
        echo "If you have issues, please report it!"
        echo "Issue Tracker: https://github.com/retrozinndev/colorshell/issues"
        sleep .5
        echo "Thanks for using colorshell! I really appreciate that :P"
        printf "\n"

        exit 0
    fi

    Send_log "Colorshell is installed!"
    exit 0
fi

printf "Ok, doing as you said! Bye bye!\n"
exit 0
}
