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
shell_configs=(
    "hypr/shell"
    "hypr/hypridle.conf"
    "hypr/scripts"
    "hypr/hyprland.conf"
    "hypr/hyprlock.conf"
    "kitty/kitty.conf"
)


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

echo "This is colorshell's update script"

if Is_installed; then
    Send_log "colorshell installation found"
else
    Send_log err "no colorshell installation found, please install it before updating"
    exit 1
fi

# Warn user of possible issues
Send_log warn "!! By running this, you assume total responsability for \
issues that can occur to your filesystem"
Send_log "The updater will only change shell configs, like hypr/shell \
and kitty/kitty.conf, not user ones(hypr/user, kitty/user.conf)"

[[ -z $skip_prompts ]] && \
    Ask "Do you want to update colorshell?"

if [[ "$answer" == y ]] || [[ "$skip_prompts" ]]; then
    if [[ "$is_standalone" ]]; then
        Send_log "The installer noticed that you're calling the script remotely"
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

    Ask "Nice! Update to latest stable version instead of unstable(latest commit)?"

    if [[ -z "$skip_prompts" ]] && [[ "$answer" == y ]]; then
        Send_log "fetching latest release from colorshell repository"
        # use `head -n1` because for some reason, github api shows the same release 3 times :'(
        latest_tag=`curl -s "$repo_api_url/releases" | jq -r '. | select(.[].prerelease == false) | .[0].tag_name' | head -n1`
        
        Send_log "Done fetching"
        Send_log "Checking out latest non-pre-release version: $latest_tag"
        git -C "$repo_directory" checkout $latest_tag > /dev/null 2>&1
    fi

    Send_log "Updating..."

    Send_log "Updating configurations"
    for dir in ${shell_configs[@]}; do
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

    # reload hyprland settings, because it stops monitoring when too much changes are made
    hyprctl reload

    if Is_running; then
        Send_log "colorshell is running, restarting shell..."
        colorshell quit || killall gjs
        # wait 2s, because the shell can take a little bit of time to close
        # (the cli is closed before the action is completed)
        sleep 2s && hyprctl dispatch exec "bash $XDG_CONFIG_HOME/hypr/scripts/exec.sh colorshell"
    fi


    if [[ -z "$skip_prompts" ]]; then
        echo "Colorshell is updated! :D"
        sleep .8
        echo "If you have issues with this update, please report it!"
        echo "Issue Tracker: https://github.com/retrozinndev/colorshell/issues"
        sleep .5
        echo "Thanks for using colorshell! I really appreciate that :P"
        printf "\n"

        exit 0
    fi

    Send_log "Colorshell is updated!"
    exit 0
fi

printf "Ok, doing as you said! Bye bye!\n"
exit 0
}
