import { register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import Compositor from "./compositor";


/** @abstract */
@register({ GTypeName: "ClshCompositorObject" })
class CObject extends GObject.Object {
    #compositor: Compositor;

    public get compositor() { return this.#compositor; }

    constructor(compositor: Compositor) {
        super();

        this.#compositor = compositor;
    }
}

namespace CObject {}

export default CObject;
