source ./scripts/utils.sh

apply_layershell=true
file="./build/colorshell"

while getopts xp: arg; do
    case "$arg" in
        x)
            unset apply_layershell
            ;;
        p)
            file=$OPTARG
            ;;
    esac
done

function start() {
    if Is_running; then
        echo "[info] killing previous instance"
        colorshell quit || kill -s 9 `cat $XDG_RUNTIME_DIR/colorshell/.pid`
    fi
    echo "[info] starting"
    LD_PRELOAD=`[[ $apply_layershell ]] && echo "/usr/lib/libgtk4-layer-shell.so"` \
        $file
}

if [[ -f $file ]]; then
    start
else
    echo "[error] can't start project: no executable found on default directory"
    echo "[tip] specify the executable path: start \"\$path\""
    exit 1
fi
