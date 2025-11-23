set -e

socket_support=true

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
  -r \$file: gresource's target path (literal; kept in \$output; default: \$XDG_DATA_HOME/colorshell/resources.gresource)
  -n: disable socket communication support(use the slower remote instance communication)
  -o \$path: build output path (default: \`./build/release\`)
  -e: set desktop entry's executable target (literal; default: \$HOME/.local/bin/colorshell)
  -h: show this help message"
            exit 0
            ;;
    esac
done

# send literal variable name, so it's interpreted at runtime
sh ./scripts/build.sh -o "${outdir:-./build/release}" -b -r "${gresource_file:-\$XDG_DATA_HOME/colorshell/resources.gresource}"

# add socket-communication support on executable
if [[ $socket_support ]]; then
    echo "[info] adding socket communication support"
    script="\
`cat ./scripts/socket.sh`
`cat "${outdir:-./build/release}/colorshell" | sed -e 's/^#.*//'`" # remove shebang

    echo -en "$script" > "${outdir:-./build/release}/colorshell"
    chmod +x "${outdir:-./build/release}/colorshell"
fi

echo "[info] making desktop entry"
entry=`cat ./resources/colorshell.desktop`
bin_target=${bin_target:-'$HOME/.local/bin/colorshell'}
echo -n "${entry/'$COLORSHELL_BINARY'/${bin_target/'$'/'\\\$'}}" > ${outdir:-./build/release}/colorshell.desktop
