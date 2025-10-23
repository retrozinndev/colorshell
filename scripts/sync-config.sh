source ./scripts/utils.sh

config_dirs=(
    "hypr/scripts" 
    "hypr/shell" 
    "hypr/hyprlock.conf" 
    "hypr/hyprland.conf" 
    "hypr/hypridle.conf" 
    "kitty/kitty.conf" 
)
outdir="./config"

Clean_local() {
    Send_log "info" "Cleaning local config..."
    for dir in ${config_dirs[@]}; do
        rm -rf $outdir/$dir
    done
}

Update_local() {
    mkdir -p $outdir
    for dir in ${config_dirs[@]}; do
        if [[ -d "$XDG_CONFIG_HOME/$dir" ]] || [[ -f "$XDG_CONFIG_HOME/$dir" ]]; then 
            Send_log "Copying ${dir^}"
            mkdir -p `dirname "$outdir/$dir"`
            cp -r $XDG_CONFIG_HOME/$dir $outdir/$dir
        else
            Send_log "warn" "Looks like the ${dir^} dir is in fault! Skipping..."
        fi
    done
}

Print_header

printf "\n"
echo "!!WARNING!! Running this script may override all configuration data in current repo with host ones."
echo "This script is intended to be used only by the repository owner"
printf "\n"

echo "Please run this script in it's current directory to avoid issues"
echo "Tip: Press [Ctrl] + [C] to stop script at any time"

printf "\n"

Ask "Update local repository with host configurations?"
if [[ ! $answer == y ]]; then
    Send_log "Exiting"
    exit 1
fi

printf "\n"

Clean_local
Update_local

if command -v git > /dev/null; then
    git status
fi

exit 0
