#!/usr/bin/env bash

trap "printf \"\nOk, quitting beacuse you entered an exit signal. (SIGINT).\n\"; exit 1" SIGINT
trap "printf \"\nOh noo!! Some application just killed the script! (SIGTERM)\"; exit 2" SIGTERM

XDG_DATA_HOME=${XDG_DATA_HOME:-"$HOME/.local/share"}
XDG_CACHE_HOME=${XDG_CACHE_HOME:-"$HOME/.cache"}
XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-"$HOME/.config"}
BIN_HOME=${BIN_HOME:-"$HOME/.local/bin"}
APPS_HOME=${APPS_HOME:-"$XDG_DATA_HOME/applications"}

skip_prompts=
is_standalone=`(git remote -v > /dev/null 2>&1) || echo -n true`

appid="io.github.retrozinndev.Colorshell"
temp_dir="$XDG_CACHE_HOME/colorshell-installer"
gresource_path="$XDG_DATA_HOME/colorshell/.gresource"
repo_directory=`[ "$is_standalone" ] && echo -n "$temp_dir/repo" || echo -n "."`
target_branch=ryo
utils_path=`[ -z "$is_standalone" ] && echo -n "$repo_directory/scripts/utils.sh"`
mode="install"

function Load_utils() {
    local url="https://raw.githubusercontent.com/\
retrozinndev/colorshell/refs/heads/$target_branch/scripts/utils.sh"

    if [[ -z $utils_path ]] || [[ ! -f $utils_path ]]; then
        if curl -s "$url" > $temp_dir/utils.sh; then
            utils_path=$temp_dir/utils.sh
        else
            if ! [ -f $temp_dir/utils.sh ]; then
                echo "[error] Failed to fetch utils script! Check your internet connection and try again ;)" > /dev/stderr
                rm -f $temp_dir/utils.sh
                exit 1
            fi

            echo "[warn] The fetch of the utils.sh script failed, but you already have the script locally"
            echo "[info] The script will use the local version. Be aware that errors may occur if the script is outdated!"

            utils_path=$temp_dir/utils.sh
        fi

    fi

    if ! source "$utils_path"; then
        echo "[error] Failed to source utils script. Please, try again" > /dev/stderr
        rm -rf $temp_dir
        exit 1
    fi
}

function Post_install() {
    # Check if user has a Hyprland config file
    if [[ ! -f "$XDG_CONFIG_HOME/hypr/hyprland.conf" ]] && [[ -f "/usr/share/hypr/hyprland.conf" ]]; then
        Send_log "Looks like Hyprland wasn't launched yet! Copying default config file..."
        mkdir -p "$XDG_CONFIG_HOME/hypr"
        cp -f "/usr/share/hypr/hyprland.conf" "$XDG_CONFIG_HOME/hypr/hyprland.conf"
        Send_log "Adding exec for colorshell in Hyprland config..."
        echo -ne "\nexec-once = ~/.local/bin/colorshell" >> "$XDG_CONFIG_HOME/hypr/hyprland.conf"

    else
        Ask "Do you want to autostart colorshell with Hyprland?"
        if [ "$answer" == "y" ]; then
            Send_log "Adding exec-once for colorshell to Hyprland..."
            echo -ne "\nexec-once = ~/.local/bin/colorshell" >> "$XDG_CONFIG_HOME/hypr/hyprland.conf"
        fi
    fi
}

# check if the script is running in standalone mode(without having cloned the repo)
remotes=`git remote -v 2> /dev/null || echo -n ""`
remote_origin=`echo "$remotes" | head -n1 | awk -F "\t| " '{print $2}'`
if [ "$remotes" ] && [[ $remote_origin =~ colorshell\.git$ ]]; then
    is_standalone=
else
    is_standalone=true
fi

# handle arguments and modes
while getopts b:huy arg; do
    case $arg in
        b | branch)
            target_branch=${OPTARG:-"ryo"}
            ;;

        u | update)
            mode="update"
            echo "Let's update :D"
            ;;

        y | yes)
            skip_prompts=true
            ;;

        ? | h | help)
            echo "\
Install colorshell, override or update an existing installation.

Options:
  -b [branch_name]: install colorshell from a specific \$branch_name than the main one
  -u: update an existing colorshell installation instead of overriding
  -y: skip all of the questions (answer \"y\" to all of them)
  -h: print this help message
"
            exit 0
            ;;

        *)
            echo "Unrecognized argument \"$arg\", please check \`--help\`" > /dev/stderr
            ;;
    esac
done


# load utils script before installation
mkdir -p "$repo_directory"
Load_utils


# installation part
# wrapping the script with '{}' makes bash force-load the script into memory, so we
# avoid issues when switching the repository source to a tag / another branch

{
Print_header
echo -e "Colorshell is a project made by retrozinndev. 
Source: https://github.com/retrozinndev/colorshell\n"
sleep .5

echo "Welcome to colorshell's $mode script!"

# Warn user of possible issues
Send_log warn "!! By running this, you're assuming total responsability for any issues that may occur with your filesystem"

[[ -z "$skip_prompts" ]] && \
    Ask "Do you want to $mode the shell?"

if [[ "$answer" == y ]] || [[ "$skip_prompts" ]]; then
    if [[ "$is_standalone" ]]; then
        Send_log "The installer noticed that you're calling the script remotely"
        Send_log "Cloning repository in \`$repo_directory\`..."
        if [[ -d $repo_directory/.git ]]; then
            Send_log "Repo is already cloned! Let's just fetch the latest changes..."
            git -C "$repo_directory" stash # if there are changes, let's just stash them

            if ! git -C "$repo_directory" checkout $target_branch; then
                Send_log err "Couldn't switch to specified target branch \"$target_branch\". Please check the branch list!"
                git -C "$repo_directory" branch -lr
                exit 1
            fi

            git -C "$repo_directory" fetch && git -C "$repo_directory" pull --rebase # rebase just in case
        else
            rm -rf $repo_directory 2> /dev/null
            git clone https://github.com/retrozinndev/colorshell.git "$repo_directory"
        fi
    fi

    Ask "Nice! Do you want to use the stable version instead of the unstable(latest commit)?"

    if [[ -z "$skip_prompts" ]] && [[ "$answer" == y ]]; then
        Send_log "Fetching latest release from colorshell repository"
        latest_tag=`curl -s "$repo_api_url/releases" | jq -r '. | select(.[].prerelease == false) | .[0].tag_name'`
        
        Send_log "Done fetching"
        Send_log "Checking out latest non-pre-release version: $latest_tag"
        git -C "$repo_directory" checkout $latest_tag > /dev/null 2>&1
    fi

    Send_log "Starting build process..."
    Send_log "Installing project modules"
    pnpm -C "$repo_directory" i > /dev/null 2>&1

    Send_log "Building colorshell"
    pnpm -C "$repo_directory" build -rg $gresource_path

    action_prefix=${mode/e/}
    Send_log "${action_prefix^}ing colorshell" # hell yeah
    # install shell
    mkdir -p $BIN_HOME
    cp -f $repo_directory/build/release/colorshell $BIN_HOME

    # install gresource
    mkdir -p $gresource_path
    cp -f $repo_directory/build/release/resources.gresource $gresource_path

    # install desktop entry
    mkdir -p $APPS_HOME
    cat $repo_directory/data/$appid.desktop | \
        sed -Ee 's/(Exec=).*/\1sh -c "$HOME\/.local\/bin\/colorshell"/' \
        > $APPS_HOME/$appid.desktop

    [[ $mode == "install" ]] && \
        Post_install

    # finish with a nice message
    Send_log "Colorshell is ${mode/e/}ed!"
    if [[ -z "$skip_prompts" ]]; then
        sleep .4
        echo "If you run into an issue with it, please report!"
        echo "Issue Tracker: https://github.com/retrozinndev/colorshell/issues"
        sleep .2
        echo "Thanks for using colorshell! I really appreciate that :3"
        printf "\n"
    fi
    exit 0
fi

# quit if user cancel the installation
printf "Ok, doing as you said! Bye bye!\n"
exit 0
}
