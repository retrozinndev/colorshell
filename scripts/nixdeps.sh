# facilites for nix building
# automates updating build hash and stuff

source ./scripts/utils.sh

function build_deps() {
    nix build .\#colorshell.pnpmDeps --rebuild $@
}

Send_log "Checking dependencies..."
hashes=`
    build_deps 2>&1 \
        | grep -E "specified:|got:" \
        | awk -F: '{print $2}' \
        | xargs
`

if [[ ! -z "$hashes" ]]; then
    Send_log err "Specified dependency hash is invalid! Will try updating it..."
    hash=`echo $hashes | awk '{print $1}'`
    new_hash=`echo $hashes | awk '{print $2}'`

    sed -i "s/$hash/$new_hash/g" nix/colorshell.nix

    build_deps --repair && \
        Send_log "Yay! It was only the hash mismatch ;3" || \
        Send_log err "Dependency build is failing, you should check out the errors"
fi
