import { bind, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalHyprland from "gi://AstalHyprland";
import { getAppIcon } from "../../scripts/apps";

const hyprland = AstalHyprland.get_default();
export const showWorkspaceNumbers = new Variable<boolean>(false);

export function Workspaces(): Gtk.Widget {

    const workspaceSpacing = 4;

    return new Widget.EventBox({
        onScroll: (_, event) => 
            event.delta_y > 0 ? hyprland.dispatch("workspace", "e-1") : hyprland.dispatch("workspace", "e+1"),
        onHover: () => showWorkspaceNumbers.set(true),
        onHoverLost: () => showWorkspaceNumbers.set(false),
        child: new Widget.Box({
            className: "workspaces",
            spacing: workspaceSpacing,
            children: bind(hyprland, "workspaces").as((workspaces) => {
                const sortedWorkspaces = workspaces.filter(ws => ws.id > 0).sort(
                    (a: AstalHyprland.Workspace, b: AstalHyprland.Workspace) => a.get_id() - b.get_id());

                return sortedWorkspaces.map((workspace: AstalHyprland.Workspace) => 
                    new Widget.Button({
                        className: Variable.derive([
                            bind(hyprland, "focusedWorkspace"),
                            showWorkspaceNumbers()
                        ], (focusedWs, showWsNumbers) =>
                            `${focusedWs.id === workspace.id ? "focus" : ""} ${showWsNumbers ? "show" : ""}`
                        )(),
                        visible: true,
                        tooltipText: Variable.derive([
                            bind(workspace, "lastClient"),
                            bind(hyprland, "focusedWorkspace")
                        ],(lastClient, focusWs) => focusWs.id === workspace.id ? "" : 
                            `Workspace ${workspace.id}${ lastClient ? ` - ${
                                    !lastClient.title.toLowerCase().includes(lastClient.class) ?
                                        `${lastClient.get_class()}: `
                                    : ""
                                } ${lastClient.title}` : "" }`)(),
                        child: new Widget.Box({
                            children: [
                                new Widget.Revealer({
                                    transitionDuration: 200,
                                    transitionType: Gtk.RevealerTransitionType.SLIDE_LEFT,
                                    revealChild: showWorkspaceNumbers(),
                                    child: new Widget.Label({
                                        label: bind(workspace, "id").as(String),
                                        className: "id",
                                        xalign: 0.5,
                                        hexpand: true,
                                    } as Widget.LabelProps)
                                } as Widget.RevealerProps),
                                new Widget.Icon({
                                    className: "last-app-icon",
                                    visible: Variable.derive([
                                        bind(workspace, "lastClient"),
                                        bind(hyprland, "focusedWorkspace")
                                    ], (lastClient, focusedWorkspace) => focusedWorkspace?.id === workspace.id ?
                                         false : Boolean(lastClient))(),
                                    icon: bind(workspace, "lastClient").as((lastClient) =>
                                        lastClient ? 
                                            getAppIcon(lastClient.initialClass) || "image-missing"
                                        : "image-missing")
                                } as Widget.IconProps),
                            ]
                        } as Widget.BoxProps),
                        onClicked: () => workspace.focus()
                    } as Widget.ButtonProps)
                )
            })
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}
