import { register } from "ags/gobject";
import Compositor from "../..";


@register({ GTypeName: "ClshHyprlandMonitor" })
class Monitor extends Compositor.Monitor {}

namespace Monitor {
    export interface SignalSignatures extends Compositor.Monitor.SignalSignatures {}
    export interface ConstructorProps extends Compositor.Monitor.ConstructorProps {}
}
