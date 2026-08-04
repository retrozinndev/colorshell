source ./scripts/utils.sh

mkdir -p ./packages

# AUR -git build
Send_log "Building colorshell-git (AUR)..."
[ ! -d packages/aur-git ] && \
    git clone aur@aur.archlinux.org:colorshell-git.git packages/aur-git
if ! makepkg -D packages/aur-git -Cc; then
    Send_log err "Build colorshell-git(AUR) failed"
    exit 1
fi

makepkg -D packages/aur-git --printsrcinfo > packages/aur-git/.SRCINFO
Send_log "Success!"
Ask "Commit?"
if [ "$answer" == "y" ]; then
    git -C packages/aur-git add -A
    git -C packages/aur-git commit -m "update to latest commit"
    git -C packages/aur-git push
fi
