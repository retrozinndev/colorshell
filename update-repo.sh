#!/usr/bin/bash

source ./utils.sh

Check_current_dir() {
    if ! [[ -f ./utils.sh ]]; then
        Send_log warn "Looks like you're not in the repository directory! \
Please run this script from the repo directory to avoid problems."
        Send_log "Exiting"
        sleep .5
        exit 1
    fi
}

Clean_local() {
    Send_log "info" "Cleaning current repo dotfiles..."
    for dir in ${config_dirs[@]}; do
        if [[ -d "./$dir" ]]; then
            rm -rf ./$dir
        fi
    done

    Send_log "info" "Cleaning wallpapers..."
    rm -rf ./wallpapers

    Send_log "Done cleaning"
}

Update_local() {
    for dir in ${config_dirs[@]}; do
        if [[ -d "$XDG_CONFIG_HOME/$dir" ]] || [[ -f "$XDG_CONFIG_HOME/$dir" ]]; then 
            Send_log "Copying ${dir^}"
            cp -r $XDG_CONFIG_HOME/$dir ./$dir
        else
            Send_log "warn" "Looks like the ${dir^} dir is in fault! Skipping..."
        fi
    done

    walls_dir=$WALLPAPERS

    if [[ -z "$walls_dir" ]] || [[ ! -d "$walls_dir" ]]; then
        walls_dir="$HOME/wallpapers"
    fi

    if [[ ! -z "$walls_dir" ]] && [[ -d "$walls_dir" ]]; then
        Send_log "Copying wallpapers"
        mkdir -p ./wallpapers
        cp -rf $HOME/wallpapers/* ./wallpapers

        return
    fi

    Send_log warn "Wallpapers dir could not be found in $HOME, skipping..."
}

Update_remote() {
    git status
    read -p "Single file/directory to add: " chosen
    if [[ -d $chosen ]] || [[ -f $chosen ]]; then
        git add $chosen
        Ask "Add more files/directories to queue?"
        if [[ $answer =~ y ]]; then
            Update_remote
            return
        fi

        commit_message=""
        commit_description=""
        push_changes=""
        echo "You can use emojis by typing its name between colons, e.g.: \":tada:\" for \"🎉\""
        echo -n "Commit message: "
        read commit_message
        echo -n "Type commit description(leave blank if none): "
        read commit_description

        Send_log "Committing changes..."
        [[ ! -z $commit_description ]] && \
            git commit -m "$commit_message" -m "$commit_description" || \
        git commit -m "$commit_message"

        Send_log "Done!"
        Ask "Push changes now? If not, you'll go back to the queue step"

        if [[ $answer == y ]]; then
            git push
            Send_log "Done pushing!"
            return
        fi

        Update_remote
    else
        echo "Looks like this file/directory does not exist."
        Update_remote
    fi

    
}

Check_current_dir
Print_header

Send_log warn "!! Running this script may override all data in the local repo with host files"
Send_log warn "This script is intended to be used only by the dotfiles owner\n"

Send_log "Please run this script in it's current directory to avoid issues"
Send_log "Tip: Press ^C([Ctrl] + [C]) to stop script at any time\n"

Ask "Update local repository with host configurations?"
if ! $answer == y; then
    Send_log "Exiting"
    exit 0
fi

printf '\n'

Clean_local
Update_local

if command -v git; then
    Ask "Would you like to commit to remote? (You will be prompted for commits)"

    if $answer =~ y; then
        Update_remote
        echo "Looks like it's done! Have a great day!"
    else
        echo "Ok, work's finished here! Have a great day!"
    fi

    git status
fi
