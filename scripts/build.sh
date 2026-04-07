
set -e

output="./build"
esbuild="/bin/env esbuild"
is_devel=false
version=`cat package.json | jq -r .version`

while getopts r:o:e:bdh args; do
    case "$args" in
        r) 
            gresources_target=${OPTARG}
            ;;
        b) 
            keep_gresource=true
            ;;
        o)
            output=${OPTARG}
            ;;
        d)
            is_devel=true
            ;;
        e)
            esbuild=${OPTARG}
            ;;
        h)
            echo "\
colorshell's build script. 
use \`build:release\` for release builds.

options: 
  -r \$file: specify gresource's target path (default: \`\$output/resources.gresource\`)
  -o \$path: specify the build's output directory (default: \`./build\`)
  -e \$cmd: specify which command to use as an esbuild wrapper(default: \`/bin/env esbuild\`)
  -b: only target gresource in the build, keeping the file in the output dir
  -d: enable developer mode in the build
  -h: show this help message"
            exit 0
            ;;
    esac
done

if [[ -d "$output" ]] && [[ ! -z "$(ls -A -w1 $output)" ]]; then
    echo "[info] cleaning previous build"
    rm -rf $output/*
else
    mkdir -p $output
fi


echo "[info] bundling project"
$esbuild --bundle ./src/app.ts \
    --outfile=$output/clsh.js \
    --source-root=./src \
    --sourcemap=inline \
    --format="esm" \
    --target=firefox128 \
    --external:"gi://*" \
    --external:"resource://*" \
    --external:"console" \
    --external:"system" \
    --external:"gettext" \
    --define:"DEVEL=$is_devel" \
    --define:"COLORSHELL_VERSION='$version'" \
    --define:"GRESOURCES_FILE='${gresources_target:-"$output/resources.gresource"}'"
_rawjs=`echo "#!/usr/bin/gjs -m" | cat - $output/clsh.js`
echo "$_rawjs" > $output/clsh.js

echo "[info] compiling gresource"
gres_target=`[[ "$keep_gresource" ]] && echo -n "$output/resources.gresource" || \
    echo -n "${gresources_target:-$output/resources.gresource}"`
mkdir -p `dirname "$gres_target"`
glib-compile-resources resources.gresource.xml \
    --sourcedir ./resources \
    --target "$gres_target"

echo "[info] creating executable"
echo -en "\
#!/usr/bin/bash

runtime_dir=\${XDG_RUNTIME_DIR:-\"/run/user/\$(id -u)\"}/colorshell
file=\"\$runtime_dir/colorshell\"

mkdir -p \"\$runtime_dir\"

echo -n '`cat $output/clsh.js | base64`' | base64 --decode > \"\$file\"
chmod +x "\$file"

LD_PRELOAD=\"/usr/lib/libgtk4-layer-shell.so\" \$file \$@
LD_PRELOAD=
" > $output/colorshell
chmod +x $output/colorshell
