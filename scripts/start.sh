source ./scripts/utils.sh

file="${1:-./build/colorshell}"

function start() {
    if Is_running; then
        echo "[info] killing previous instance"
        colorshell quit || killall gjs
    fi
    echo "[info] starting"
    exec "$file"
}

if [[ -f $file ]]; then
    start
else
    echo "[error] can't start project: no executable found on default directory"
    echo "[tip] specify the executable path: start \"\$path\""
    exit 1
fi
