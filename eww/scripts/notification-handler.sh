#!/usr/bin/env bash

# initial notification history
json_initial_history=$(makoctl history | jq -c '.data[]' | sed -e 's/\\[n]/\\n/g' -e 's/&/&amp;/g')
echo $json_initial_history

while true; do
    # watch history every 200ms
    sleep .2

    # frequently updated history variable
    json_history=$(makoctl history | jq -c '.data[]' | sed -e 's/\\[n]/\\n/g' -e 's/&/&amp;/g')

    if ! [[ "$json_initial_history" == "$json_history" ]]; then
        json_initial_history="$json_history"
        echo "$json_initial_history"
    fi
done
