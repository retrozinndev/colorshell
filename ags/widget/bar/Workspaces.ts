import { bind, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalHyprland from "gi://AstalHyprland";
import { getAppIcon, getSymbolicIcon } from "../../scripts/apps";
import { Windows } from "../../windows";
import { Config } from "../../scripts/config";
import { Separator, SeparatorProps } from "../Separator";

let showWsNum: (Variable<boolean>|undefined);
export const showWorkspaceNumber = (show: boolean) => 
    showWsNum?.set(show);


export function Workspaces(): Gtk.Widget {
    showWsNum ??= new Variable<boolean>(false);

    return new Widget.Box({
        className: "workspaces-row",
        orientation: Gtk.Orientation.HORIZONTAL,
        children: [
            new Widget.EventBox({
                className: "special",
                visible: bind(AstalHyprland.get_default(), "workspaces").as((workspaces) => 
                    workspaces.filter(ws => ws.id < 0).sort((a, b) => a.id - b.id).length > 0),
                child: new Widget.Box({
                    className: "special-workspaces",
                    spacing: 4,
                    children: bind(AstalHyprland.get_default(), "workspaces").as((workspaces) => 
                        workspaces.filter(ws => ws.id < 0).sort((a, b) => a.id - b.id).map((workspace) => 
                            new Widget.EventBox({
                                className: bind(AstalHyprland.get_default(), "focusedWorkspace").as(focusWs =>
                                    `${focusWs.id === workspace.id ? "focus" : ""}`),
                                tooltipText: bind(workspace, "name").as((name) => {
                                    name = name.replace(/^special\:/, "");
                                    return name.charAt(0).toUpperCase().concat(name.substring(1, name.length));
                                }),
                                child: new Widget.Box({
                                    hexpand: true,
                                    child: bind(workspace, "lastClient").as(lastClient => 
                                        new Widget.Icon({
                                            className: "last-app-icon",
                                            halign: Gtk.Align.CENTER,
                                            visible: Variable.derive([
                                                bind(workspace, "lastClient"),
                                                bind(AstalHyprland.get_default(), "focusedWorkspace")
                                            ], (lastClient, focusedWorkspace) => focusedWorkspace?.id === workspace.id ?
                                                 false : Boolean(lastClient))(),
                                            icon: lastClient ? bind(lastClient, "initialClass").as((initialClass) =>
                                                getSymbolicIcon(initialClass) ?? getAppIcon(initialClass) ?? 
                                                    "application-x-executable-symbolic") : undefined
                                        } as Widget.IconProps)
                                    )
                                } as Widget.BoxProps),
                                onClickRelease: () => AstalHyprland.get_default().dispatch(
                                    "togglespecialworkspace", workspace.name.replace(/^special\:/, "")
                                )
                            } as Widget.EventBoxProps)
                        )
                    )
                } as Widget.BoxProps)
            } as Widget.EventBoxProps),
            Separator({
                alpha: .2,
                orientation: Gtk.Orientation.HORIZONTAL,
                margin: 12,
                spacing: 8,
                visible: bind(AstalHyprland.get_default(), "workspaces").as(wss => 
                    wss.filter(ws => ws.id < 0).length > 0)
            } as SeparatorProps),
            new Widget.EventBox({
                onScroll: (_, event) => 
                    event.delta_y > 0 ? 
                        AstalHyprland.get_default().dispatch("workspace", "e-1")
                    : AstalHyprland.get_default().dispatch("workspace", "e+1"),
                onHover: () => showWorkspaceNumber(true),
                onHoverLost: () => showWorkspaceNumber(false),
                onDestroy: () => {
                    // check if the current widgets is from the only bar
                    if((Windows.openWindows["bar"] as (Array<Widget.Window>|undefined))?.length === 1) {
                        showWsNum?.drop();
                        showWsNum = undefined;
                    }
                },
                child: new Widget.Box({
                    className: "workspaces",
                    spacing: 4,
                    children: bind(AstalHyprland.get_default(), "workspaces").as((workspaces) => 
                        workspaces.filter((ws) => ws.id > 0).sort((a, b) => a.id - b.id).map((workspace, wsIndex, workspaces) => {
                            
                            const showIds: Variable<boolean> = Variable.derive([
                                Config.getDefault().bindProperty("workspaces.always_show_id", "boolean").as(Boolean),
                                Config.getDefault().bindProperty("workspaces.enable_helper", "boolean").as(Boolean),
                                showWsNum!()
                            ], (alwaysShowIds, enableHelper, showIds) => {
                                if(enableHelper && !alwaysShowIds) {
                                    const previousWorkspace = workspaces[wsIndex-1];
                                    const nextWorkspace = workspaces[wsIndex+1];

                                    if((workspaces.filter((_, i) => i < wsIndex).length > 0 && 
                                        previousWorkspace?.id < (workspace.id-1)) || 
                                       (workspaces.filter((_, i) => i > wsIndex).length > 0 && 
                                        nextWorkspace?.id > (workspace.id+1))) {

                                        return true;
                                    }
                                }

                                return alwaysShowIds || showIds;
                            });

                            const className = Variable.derive([
                                bind(AstalHyprland.get_default(), "focusedWorkspace"),
                                showIds!()
                            ], (focusedWs, showWsNumbers) =>
                                `${focusedWs.id === workspace.id ? "focus" : ""} ${
                                    showWsNumbers ? "show" : ""}`
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
                                    showIds.drop();
                                    className.drop();
                                    tooltipText.drop();
                                },
                                child: new Widget.Box({
                                    hexpand: true,
                                    children: bind(workspace, "lastClient").as((lastClient) => {
                                        const widgets: Array<Gtk.Widget> = [
                                            new Widget.Revealer({
                                                transitionDuration: 200,
                                                transitionType: Gtk.RevealerTransitionType.SLIDE_LEFT,
                                                revealChild: showIds!(),
                                                hexpand: true,
                                                child: new Widget.Label({
                                                    label: bind(workspace, "id").as(String),
                                                    className: "id",
                                                } as Widget.LabelProps)
                                            } as Widget.RevealerProps),
                                        ];

                                        if(lastClient) {
                                            widgets.push(new Widget.Icon({
                                                className: "last-app-icon",
                                                halign: Gtk.Align.CENTER,
                                                expand: true,
                                                visible: bind(AstalHyprland.get_default(), "focusedWorkspace").as(focusedWorkspace =>
                                                    workspace.id === focusedWorkspace.id ?
                                                        false
                                                    : Boolean(lastClient)),
                                                icon: lastClient ?
                                                    bind(lastClient, "initialClass").as((clss) =>
                                                        getSymbolicIcon(clss) ?? getAppIcon(clss) ?? "application-x-executable-symbolic")
                                                : undefined
                                            } as Widget.IconProps));
                                        }

                                        return widgets;
                                    })
                                } as Widget.BoxProps)
                            } as Widget.EventBoxProps);
                        })
                    )
                } as Widget.BoxProps)
            } as Widget.EventBoxProps)
        ]
    } as Widget.BoxProps);
}
