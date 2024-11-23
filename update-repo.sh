#!/usr/bin/bash

HYPRLAND_DOTS_DIRS=("hypr" "swaync" "eww" "anyrun" "wlogout" "wal" "fastfetch")
WALLPAPERS_DIR="$HOME/wallpapers"

printf "\n"

echo "Running this script may override all data in current repo with current user dotfiles."
echo "This script is intended to be used by repository owner(retrozinndev)"

printf "\n"

echo "Please run this script in it's current directory to avoid problems."
echo "Tip: Press Ctrl + C to stop script at any time"

printf "\n"

Send_log() {
    output_color=""

    if [[ $1 =~ ^inf(o)$ ]]
    then
        output_color="\e[34m"
    fi

    if [[ $1 =~ ^warn(ing)$ ]]
    then
        output_color="\e[33m"
    fi

    if [[ $1 =~ ^err(or)$ ]]
    then
        output_color="\e[31m"
    fi

    echo -e "[${output_color}$1\e[0m] $2"
}

Check_current_dir() {
    if ! [[ -f ./update-repo.sh ]]
    then
        Send_log "warning" "Looks like you're not in the repo dir! Please run this script from the repo to avoid problems."
        printf "Quitting...\n"
        sleep .5
        exit 1
    fi
}

Clean_local() {
    Send_log "info" "Cleaning current repo dotfiles..."
    # Modify dirs here when adding something new:
    for dir in ${HYPRLAND_DOTS_DIRS[@]}; do
        if [[ -d "./$dir" ]]; then
            rm -rf ./$dir
        fi
    done

    Send_log "info" "Cleaning wallpapers..."
    rm -rf ./wallpapers

    echo "Done cleaning."
}

Check_existance() {
    if [[ -d "./$1" ]]; then
        return 0
    fi

    return 1
}

Update_local() {
    for dotsDir in ${HYPRLAND_DOTS_DIRS[@]}; do
        if [[ -d "$HOME/.config/$dotsDir" ]]; then 
            Send_log "info" "Trying to copy ${dotsDir^}..."
            cp -r $HOME/.config/$dotsDir ./$dotsDir
        else
            Send_log "warn" "Looks like the ~/.config/$dotsDir dir is in fault! Skipping it..."
        fi
    done

    if [[ -d $WALLPAPERS_DIR ]]; then
        Send_log "info" "Copying wallpapers"
        mkdir -p ./wallpapers
        cp -rf $WALLPAPERS_DIR/* ./wallpapers
    else
        Send_log "warn" "Wallpapers dir could not be found in $HOME, skipping..."
    fi

    printf "\nDone updating local repo!\n"
}

Update_remote() {
    echo "Git status:"
    /usr/bin/env git status
    echo "Please type one of the dotfiles you want to push now(only one dir):"
    ls --color=auto -d -- */
    printf "Directory: "
    read chosen_dir 
    if [[ -d $chosen_dir ]]; then
        git add $chosen_dir
        echo -n "Would you like to add more dirs to queue? [y/n] "
        read add_more_dirs
        if [[ $add_more_dirs =~ y ]]; then
            Update_remote
        else
            echo "Fine then! What will be the commit message? (You can use emojis by typing its name between colons, e.g.: ´:tada:´)"
            read commit_message
            echo "Committing your changes..."
            git commit -m "$commit_message"
            echo -n "Done! Do you want to push changes now? If not, you'll be redirected to pre-commit process. [y/n] "
            read push_changes
            if [[ $push_changes =~ y ]]; then
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

echo "Starting in 3... "
sleep 1s
echo "2..."
sleep 1s
echo "1..."
sleep 1s

printf "\n"

Clean_local

# Updates local repository with current user dotfiles
Update_local

echo -n "Would you like to push selected changes to remote? (You will be prompted to select folders) [y/n] "
read push_changes_to_remote

if [[ $push_changes_to_remote =~ y ]]
then
    Update_remote
    echo "Looks like it's done! Bye bye, have a great day!"
else
    echo "Ok, work has been finished here! Bye bye!"
fi

if [[ -f "/usr/bin/git" ]]
then
    printf "\nGit status: \n"
    git status
fi

exit 0
