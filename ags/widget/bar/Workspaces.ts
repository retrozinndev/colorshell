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
                    new Widget.EventBox({
                        className: Variable.derive([
                            bind(hyprland, "focusedWorkspace"),
                            showWorkspaceNumbers()
                        ], (focusedWs, showWsNumbers) =>
                            `${focusedWs.id === workspace.id ? "focus" : ""} ${showWsNumbers ? "show" : ""}`
                        )(),
                        onClickRelease: () => workspace.focus(),
                        tooltipText: Variable.derive([
                            bind(workspace, "lastClient"),
                            bind(hyprland, "focusedWorkspace")
                        ], (lastClient, focusWs) => focusWs.id === workspace.id ? "" : 
                            `Workspace ${workspace.id}${ lastClient ? ` - ${
                                !lastClient.title.toLowerCase().includes(lastClient.class) ?
                                    `${lastClient.get_class()}: `
                                : ""
                            } ${lastClient.title}` : "" }`
                        )(),
                        child: new Widget.Box({
                            children: bind(workspace, "lastClient").as((lastClient) => [
                                new Widget.Revealer({
                                    transitionDuration: 200,
                                    transitionType: Gtk.RevealerTransitionType.SLIDE_LEFT,
                                    revealChild: showWorkspaceNumbers(),
                                    child: new Widget.Label({
                                        label: bind(workspace, "id").as(String),
                                        className: "id",
                                        hexpand: true
                                    } as Widget.LabelProps)
                                } as Widget.RevealerProps),
                                new Widget.Icon({
                                    className: "last-app-icon",
                                    visible: bind(hyprland, "focusedWorkspace").as(focusedWorkspace =>
                                        workspace.id === focusedWorkspace.id ?
                                            false
                                        : Boolean(lastClient)),
                                    icon: lastClient ?
                                        bind(lastClient, "class").as((clss) =>
                                            getAppIcon(clss) ?? "application-x-executable-symbolic")
                                    : undefined
                                } as Widget.IconProps)
                            ])
                        } as Widget.BoxProps)
                    } as Widget.EventBoxProps)
                )
            })
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}
