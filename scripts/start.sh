file="${1:-./build/colorshell}"

function is_running() {
    if gdbus introspect --session \
        --dest io.github.retrozinndev.colorshell \
        --object-path /io/github/retrozinndev/colorshell > /dev/null 2>&1
    then
        return 0
    fi

    return 1
}

function start() {
    if is_running; then
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
