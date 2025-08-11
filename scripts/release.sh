set -e

outdir="./build/release"

while getopts o:r:h args; do
    case "$args" in 
        o)
            outdir=${OPTARG}
            ;;
        r)
            gresource_file=${OPTARG}
            ;;
        h)
            echo "\
colorshell's automated release-build script.

options:
  -r \$file: gresource's target path (shell-only, file is kept in \$output. default: \$XDG_DATA_HOME/colorshell/resources.gresource)
  -o \$path: build output path (default: \`./build/release\`)
  -h: show this help message"
            exit 0
            ;;
    esac
done

# send literal variable name, so it's interpreted in the shell rather than in the build
pnpm build -o "${outdir:-./build/release}" -b -r "${gresource_file:-\$XDG_DATA_HOME/colorshell/resources.gresource}"
