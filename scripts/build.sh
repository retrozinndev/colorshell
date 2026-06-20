set -e

skip_gresource=
gresource_target=
socket_support=
output="./build"
is_devel=true
version=`cat package.json | jq -r .version`
head=`command -v git 2>&1 > /dev/null && git rev-parse HEAD || echo $version`
udate=`date +%s`
appname="colorshell"
appid="io.github.retrozinndev.Colorshell"
entryfile=src/app.ts
srcroot=src

while getopts :g:o:srhj arg; do
    case "$arg" in
        g)
            gresource_target=${OPTARG}
            ;;
        j)
            skip_gresource=true
            ;;
        o)
            output=${OPTARG}
            ;;
        s)
            socket_support=true
            ;;
        r)
            unset is_devel
            output="./build/release"
            socket_support=true
            ;;
        h | ?)
            echo "\
$appname's build script. 
use the \"-r\" flag for release builds.

options: 
  -g \$file: tell $appname which path to search for the gresource (default: \`./build/resources.gresource\`)
  -o \$path: build output directory (where build output is stored. default: \`./build\`)
  -j: skip gresource compiling step (useful for nix)
  -s: enable socket cli support (sends args to socket if available, avoids wasting your time)
  -r: make a release build
  -h: show this help message"
            exit 0
            ;;
    esac
done

gresource_target=${gresource_target:-"$output/resources.gresource"}

if [[ -d $output ]] && [[ ! -z `ls -A -w1 $output` ]]; then
    echo "[info] cleaning up"
    rm -r $output/*
else
    mkdir -p $output
fi

echo "[info] bundling"
{
    echo -e "#!/usr/bin/gjs -m\n"
    esbuild --bundle $entryfile \
      --source-root=$srcroot \
      --sourcemap=inline \
      --format="esm" \
      --target=firefox128 \
      --external:"gi://*" \
      --external:"resource://*" \
      --external:"console" \
      --external:"system" \
      --external:"gettext" \
      --define:"DEVEL=${is_devel:-"false"}" \
      --define:"VERSION='$version'" \
      --define:"GRESOURCE='$gresource_target'" \
      --define:"BUILD_DATE=$udate" \
      --define:"HEAD='$head'"

} > $output/$appname.js

if [[ -z $skip_gresource ]]; then
    echo "[info] compiling gresource"
    glib-compile-resources data/$appid.gresource.xml \
        --sourcedir ./data \
        --target $output/resources.gresource
fi

echo "[info] creating executable"
echo -en "\
#!/usr/bin/bash

export XDG_CACHE_HOME=\${XDG_CACHE_HOME:-\"\$HOME/.cache\"}
export XDG_DATA_HOME=\${XDG_DATA_HOME:-\"\$HOME/.local/share\"}
export XDG_CONFIG_HOME=\${XDG_CONFIG_HOME:-\"\$HOME/.config\"}
export XDG_RUNTIME_DIR=\${XDG_RUNTIME_DIR:-\"/run/user/\`id -u\`\"}

runtime_dir=\$XDG_RUNTIME_DIR/$appname
file=\"\$XDG_RUNTIME_DIR/$appname/$appname\"
`[[ $socket_support ]] && (cat ./scripts/socket.sh | sed -E '/(^#!.*)|^$/d')`

mkdir -p \"\$XDG_RUNTIME_DIR/$appname\"
echo -n '`cat $output/$appname.js | base64`' | base64 --decode > \"\$file\"
chmod +x "\$file"

export LD_PRELOAD=\"/usr/lib/libgtk4-layer-shell.so\"
\$file \$@
export LD_PRELOAD=
" > $output/$appname
chmod +x $output/$appname
