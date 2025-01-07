#!/usr/bin/env bash

print_workspaces_literal() {
    active_workspace_id=$(hyprctl -j activeworkspace | jq -c '.id' | xargs)
    json_workspaces=$(hyprctl -j workspaces | jq -c '.')
    existing_workspaces=$(echo $json_workspaces | jq -c '.[].id' | xargs)

    output="
        (box :space-evenly false
             :orientation \"horizontal\""

    for i in {1..10}; do
        output=$output"
            (button :onclick \"hyprctl dispatch workspace $i >> /dev/null \" 
            :class \"\${ $active_workspace_id == $i ? 'active' : '' } $( [[ $(echo $json_workspaces | jq -c ".[$i - 1].name") =~ "special:" ]] && echo 'special' )\"
                    :visible { \"$existing_workspaces\" =~ $i ? true : false }
                    :tooltip \"Workspace ${i}\"
            \"\")"

        if [ $i == 10 ]; then
            output=$output")" # closes box if last
        fi
    done
    
    echo "$(echo $output | xargs -0)"
}

# display workspaces on startup
print_workspaces_literal

handle() {
  case $1 in
    workspace*) print_workspaces_literal;;
  esac
}

socat -U - UNIX-CONNECT:$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock | while read -r line; do handle "$line"; done
