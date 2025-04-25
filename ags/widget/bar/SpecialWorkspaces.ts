import { bind, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3"
import AstalHyprland from "gi://AstalHyprland";
import { getAppIcon } from "../../scripts/apps";

export const SpecialWorkspaces: (() => Gtk.Widget) = () => new Widget.EventBox({
    className: "special-ws-eventbox",
    visible: bind(AstalHyprland.get_default(), "workspaces").as((workspaces) => 
        workspaces.filter(ws => ws.id < 0).sort((a, b) => a.id - b.id).length > 0),
    child: new Widget.Box({
        className: "special-workspaces",
        children: bind(AstalHyprland.get_default(), "workspaces").as((workspaces) => 
            workspaces.filter(ws => ws.id < 0).sort((a, b) => a.id - b.id).map((workspace) => 
                new Widget.Button({
                    className: bind(AstalHyprland.get_default(), "focusedWorkspace").as(focusWs =>
                        `${focusWs.id === workspace.id ? "focus" : ""}`),
                    tooltipText: bind(workspace, "name").as((name) => {
                        name = name.replace(/^special\:/, "");
                        return name.charAt(0).toUpperCase().concat(name.substring(1, name.length));
                    }),
                    child: new Widget.Icon({
                        className: "last-app-icon",
                        visible: Variable.derive([
                            bind(workspace, "lastClient"),
                            bind(AstalHyprland.get_default(), "focusedWorkspace")
                        ], (lastClient, focusedWorkspace) => focusedWorkspace?.id === workspace.id ?
                             false : Boolean(lastClient))(),
                        icon: bind(workspace, "lastClient").as((lastClient) =>
                            lastClient ? 
                                getAppIcon(lastClient.initialClass) || "image-missing"
                            : "image-missing")
                    } as Widget.IconProps),
                    onClicked: () => AstalHyprland.get_default().dispatch(
                        "togglespecialworkspace", workspace.name.replace(/^special\:/, "")
                    )
                } as Widget.ButtonProps)
            )
        )
    } as Widget.BoxProps)
} as Widget.EventBoxProps);
