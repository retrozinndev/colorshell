
set -e

output="./build"

while getopts r:o:bdh args; do
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
        h)
            echo "\
colorshell's build script. 
use \`build:release\` for release builds.

options: 
  -r \$file: specify gresource's target path (default: \`\$output/resources.gresource\`)
  -o \$path: specify the build's output directory (default: \`./build\`)
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

echo "[info] compiling gresource"
gres_target=`[[ "$keep_gresource" ]] && echo -n "$output/resources.gresource" || \
    echo -n "${gresources_target:-$output/resources.gresource}"`
mkdir -p `dirname "$gres_target"`
glib-compile-resources resources.gresource.xml \
    --sourcedir ./resources \
    --target "$gres_target"

echo "[info] bundling project"
ags --gtk 4 bundle src/app.ts $output/colorshell \
    -r ./src \
    -d "DEVEL=`[[ $is_devel ]] && echo -n true || echo -n false`" \
    -d "COLORSHELL_VERSION='`cat package.json | jq -r .version`'" \
    -d "GRESOURCES_FILE='${gresources_target:-$output/resources.gresource}'" \
|| rm -rf src/node_modules
