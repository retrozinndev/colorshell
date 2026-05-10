set -e

socket_support=true
outdir="./build/release"
bin_target="\$HOME/.local/bin/colorshell"
appid="io.github.retrozinndev.Colorshell"

# send literal variable name, so it's interpreted at runtime
gresource_file="\$XDG_DATA_HOME/colorshell/.gresource"

while getopts o:r:e:hn args; do
    case "$args" in 
        o)
            outdir=${OPTARG}
            ;;
        r)
            gresource_file=${OPTARG}
            ;;
        e)
            bin_target=${OPTARG}
            ;;
        n)
            unset socket_support
            ;;
        ? | h)
            echo "\
colorshell's automated release-build script.

help:
  'literal': the argument should have environment variables sent as a literal string, 
  they're replaced at runtime.
  'default': argument's default value, they're used if none are provided.

options:
  -r \$file: gresource's target path (literal; kept in \$output; default: \`$gresource_file\`)
  -n: disable socket communication support(use the slower remote instance communication)
  -o \$path: build output path (default: \`$outdir\`)
  -e: set desktop entry's executable target (literal; default: \`$bin_target\`)
  -h: show this help message"
            exit 0
            ;;
    esac
done

sh ./scripts/build.sh -o "$outdir" -b -r "$gresource_file"

# add socket-communication support on executable
script="\
#!/usr/bin/bash

XDG_CACHE_HOME=\${XDG_CACHE_HOME:-\"\$HOME/.cache\"}
XDG_DATA_HOME=\${XDG_DATA_HOME:-\"\$HOME/.local/share\"}
XDG_CONFIG_HOME=\${XDG_CONFIG_HOME:-\"\$HOME/.config\"}
XDG_RUNTIME_DIR=\${XDG_RUNTIME_DIR:-\"/run/user/\`id -u\`\"}
`[[ $socket_support ]] && (cat ./scripts/socket.sh | sed -e 's/^#!.*//')`
`cat "$outdir/colorshell" | sed -E 's/^#!.*$//'`" # remove shebang


echo -en "$script" > "${outdir:-./build/release}/colorshell"
chmod +x "${outdir:-./build/release}/colorshell"

echo "[info] making desktop entry"
entry=`cat ./data/$appid.desktop`
bin_target=${bin_target:-'$HOME/.local/bin/colorshell'}
echo -n "${entry/'$COLORSHELL_BINARY'/${bin_target/'$'/'\\\$'}}" > ${outdir:-./build/release}/$appid.desktop
