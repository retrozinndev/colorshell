if [[ -d "@types" ]] && [[ ! "$1" == "-f" ]]; then
    echo "Types skipped(already built). To force-build, run \`types -f\`"
    exit 0
fi


echo "Building types, this can take long..."
girgen -i Gtk-3.0 typescript --alias
