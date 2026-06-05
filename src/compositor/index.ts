import _Client from "./client";
import _Monitor from "./monitor";
import _Workspace from "./workspace";
import _Compositor from "./compositor";
import _CObject from "./object";


namespace Compositor {
    export import Client = _Client;
    export import Compositor = _Compositor;
    export import Workspace = _Workspace;
    export import Monitor = _Monitor;
    export import Object = _CObject;

    let instance: Compositor|null = null;

    /** set the `Compositor` implementation(only if not set already) */
    export function setDefault(impl: Compositor) {
        if(instance !== null)
            throw new Error("Couldn't set default Compositor implementation: already set");

        instance = impl;
    }

    /** get the default `Compositor` implementation */
    export function getDefault(): Compositor {
        return instance!;
    }
}

export default Compositor;
