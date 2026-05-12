import Compositor from "../..";


class Workspace extends Compositor.Workspace {}

namespace Workspace {
    export interface SignalSignatures extends Compositor.Workspace.SignalSignatures {}
    export interface ConstructorProps extends Compositor.Workspace.ConstructorProps {}
}

export default Workspace;
