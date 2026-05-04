# This script contains useful functions to be used 
# in other scripts from colorshell.
# ----------
# Made by retrozinndev (João Dias)
# Licensed under the BSD 3-Clause License
# From: https://github.com/retrozinndev/colorshell


# -------------
# The repository's api url
# -------------
repo_api_url=https://api.github.com/repos/retrozinndev/colorshell

# -------------
# Sends stdout log with type and message provided 
# in parameters.
# param $1 (optional) log type (err[or], warn[ing]), if not any of list, print as info
# param $2 log message
# -------------
function Send_log() {
    log_message=`[[ -z $2 ]] && echo $1 || echo $2`
    color="\e[34m"
    log_type="info"

    case "${1,,}" in
        warn)
            color="\e[33m"
            log_type="warning"
            ;;

        err)
            color="\e[31m"
            log_type="error"
            ;;
    esac

    echo -e "${color}[$log_type]\e[0m $log_message"
}

# -------------
# Prints retrozinndev/colorshell installation 
# script's welcome header on stdout
# -------------
function Print_header() {
    printf "\n"
    echo "#############################"
    echo "## Colorshell Installation ##"
    echo "#############################"
    printf "\n"
}

# -------------
# Ask a yes/no question to user
# Input answer is exported as $answer
# -------------
function Ask() {
    read -n 1 -p "$@ [y/n] " answer
    printf '\n'
    if [[ ! $answer =~ [ynYN] ]]; then
        Ask "$@" # restart if different from accepted chars
    fi

    export answer
}

# -------------
# Checks if colorshell is up and running
# Returns code 0 if running, 1 if not
# -------------
function Is_running() {
    local pidfile=$XDG_RUNTIME_DIR/colorshell/.pid
    if [ -f "$pidfile" ] && ps -p `cat "$pidfile"` > /dev/null; then
        return 0
    fi

    return 1
}

# -------------
# Check if colorshell is installed
# Returns code 0 if installed, 1 if not
# -------------
function Is_installed() {
    local executable=${@:-"$HOME/.local/bin/colorshell"}

    if command -v colorshell > /dev/null 2>&1 || [[ -f $executable ]]; then
        return 0
    fi

    return 1
}

# -------------
# Interactively backup user dotfiles that ovewritten by colorshell
# param $1: colorshell repository directory
# -------------
function Backup_config() {
    local bkp_dir="$HOME/config.bkp"
    local repo_dir=${1:-"."}

    Send_log "Creating backup in $bkp_dir"

    if [[ -d $bkp_dir ]] || [[ -f $bkp_dir ]]; then
        Send_log "Found existing backup in $bkp_dir!"
        Ask "Would you like to move it to trash/override it?"
        
        if [[ $answer == "y" ]]; then
            echo "Previous backup is being moved to trash"
            trash-put $bkp_dir || (mkdir -p "$XDG_DATA_HOME/Trash" && \
                mv $bkp_dir "$XDG_DATA_HOME/Trash/$(basename $bkp_dir)" || \
            rm -rf $bkp_dir)
        else 
            echo "Ok! Skipping backup because it already exists"
            return 0
        fi
    fi

    # Make backup of existing configurations
    mkdir -p $bkp_dir
    for dir in $(basename `ls -A $repo_directory/config`); do
        if [[ -d "$XDG_CONFIG_HOME/$dir" ]]; then
            echo "-> backing up $dir"
            cp -r "$XDG_CONFIG_HOME/$dir" $bkp_dir
        else
            Send_log "Skipped \"$dir\", not found"
        fi
    done

    Send_log "Backup has been finished"
}


# -------------
# Ask the user to choose a number from the provided list
# Input answer is exported as $answer
# (this function is not done yet)
# -------------
function Choose() {
    read -n 1 -p "$1 [y/n] " r
    printf '\n'
    export answer=$r
}
