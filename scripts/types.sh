if [[ -d "@types" ]] && [[ ! "$1" == "-f" ]]; then
    echo "Types skipped(already built). To force-build, run \`types\`"
    exit 0
fi


echo "Building types, this can take long..."
pnpx @ts-for-gir/cli generate --ignoreVersionConflicts
