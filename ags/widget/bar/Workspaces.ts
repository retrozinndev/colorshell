import { bind, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalHyprland from "gi://AstalHyprland";
import { getSymbolicIcon } from "../../scripts/apps";

let showWsNum: (Variable<boolean>|undefined);
export const showWorkspaceNumber = (show: boolean) => 
    showWsNum?.set(show);


export function Workspaces(): Gtk.Widget {
    showWsNum = new Variable<boolean>(false);

    return new Widget.EventBox({
        onScroll: (_, event) => 
            event.delta_y > 0 ? 
                AstalHyprland.get_default().dispatch("workspace", "e-1")
            : AstalHyprland.get_default().dispatch("workspace", "e+1"),
        onHover: () => showWorkspaceNumber(true),
        onHoverLost: () => showWorkspaceNumber(false),
        onDestroy: () => {
            showWsNum?.drop();
            showWsNum = undefined;
        },
        child: new Widget.Box({
            className: "workspaces",
            spacing: 4,
            children: bind(AstalHyprland.get_default(), "workspaces").as((workspaces) => 
                workspaces.filter((ws) => ws.id > 0).sort((a, b) => a.id - b.id).map((workspace) => {
                    const className = Variable.derive([
                        bind(AstalHyprland.get_default(), "focusedWorkspace"),
                        showWsNum!()
                    ], (focusedWs, showWsNumbers) =>
                        `${focusedWs.id === workspace.id ? "focus" : ""} ${showWsNumbers ? "show" : ""}`
                    );

                    const tooltipText = Variable.derive([
                        bind(workspace, "lastClient"),
                        bind(AstalHyprland.get_default(), "focusedWorkspace")
                    ], (lastClient, focusWs) => focusWs.id === workspace.id ? "" : 
                        `Workspace ${workspace.id}${ lastClient ? ` - ${
                            !lastClient.title.toLowerCase().includes(lastClient.class) ?
                                `${lastClient.get_class()}: `
                            : ""
                        } ${lastClient.title}` : "" }`
                    );

                    return new Widget.EventBox({
                        className: className(),
                        onClickRelease: () => workspace.focus(),
                        tooltipText: tooltipText(),
                        onDestroy: () => {
                            className.drop();
                            tooltipText.drop();
                        },
                        child: new Widget.Box({
                            children: bind(workspace, "lastClient").as((lastClient) => [
                                new Widget.Revealer({
                                    transitionDuration: 200,
                                    transitionType: Gtk.RevealerTransitionType.SLIDE_LEFT,
                                    revealChild: showWsNum!(),
                                    child: new Widget.Label({
                                        label: bind(workspace, "id").as(String),
                                        className: "id",
                                        hexpand: true
                                    } as Widget.LabelProps)
                                } as Widget.RevealerProps),
                                new Widget.Icon({
                                    className: "last-app-icon",
                                    visible: bind(AstalHyprland.get_default(), "focusedWorkspace").as(focusedWorkspace =>
                                        workspace.id === focusedWorkspace.id ?
                                            false
                                        : Boolean(lastClient)),
                                    icon: lastClient ?
                                        bind(lastClient, "class").as((clss) =>
                                            getSymbolicIcon(clss) ?? "application-x-executable-symbolic")
                                    : undefined
                                } as Widget.IconProps)
                            ])
                        } as Widget.BoxProps)
                    } as Widget.EventBoxProps);
                })
            )
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}
