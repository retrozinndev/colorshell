#!/usr/bin/bash

source ./utils.sh

Check_current_dir() {
    if ! [[ -f ./utils.sh ]]; then
        Send_log warn "Looks like you're not in the repository directory!\nPlease run this script from the repo directory to avoid problems."
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

    echo "Done cleaning."
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
    echo "Git status:"
    /bin/env git status
    echo "Please type one of the dotfiles you want to push now(only one dir):"
    printf "directory/file: "
    read chosen_dir 
    if [[ -d $chosen_dir ]] || [[ -f $chosen_dir ]]; then
        git add $chosen_dir
        echo -n "Would you like to add more dirs to queue? [y/n] "
        read add_more_dirs
        if [[ $add_more_dirs =~ y ]]; then
            Update_remote
        else
            commit_message=""
            commit_description=""
            push_changes=""
            echo -en "(You can use emojis by typing its name between colons, e.g.: \":tada:\" for \"🎉\").\nCommit message: "
            read commit_message
            echo -n "Type commit description(leave blank if none): "
            read commit_description

            echo "Committing changes..."
            [[ ! -z $commit_description ]] && \
                git commit -m "$commit_message" -m "$commit_description" || \
            git commit -m "$commit_message"

            echo -n "Done! Do you want to push? If not, you'll go back to file selection [y/n] "
            read push_changes

            if [[ $push_changes =~ "^y" ]]; then
                git push
                echo "Done pushing!!"
            else
                Update_remote
            fi
        fi
    else
        echo "Looks like this directory does not exist! Try taking a look at the dir list."
        Update_remote
    fi

    
}

Check_current_dir
Print_header

printf "\n"
echo "!!WARNING!! Running this script may override all data in current repo with host configurations."
echo "This script is intended to be used only by the dotfiles owner"
printf "\n"

echo "Please run this script in it's current directory to avoid issues"
echo "Tip: Press Ctrl + C to stop script at any time"

printf "\n"

echo -n "Do you want to update local repository with host configurations? [y/n] "
read answer
if ! [[ $answer =~ y ]]; then
    Send_log "Exiting"
    exit 1
fi

printf "\n"

Clean_local
Update_local

echo -n "Would you like to commit to remote? (You will be prompted for commits) [y/n] "
read answer

if [[ $answer =~ y ]]; then
    Update_remote
    echo "Looks like it's done! Have a great day!"
else
    echo "Ok, work's finished here! Have a great day!"
fi

env git status

exit 0
