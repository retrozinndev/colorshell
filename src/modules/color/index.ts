import GObject from "gi://GObject?version=2.0";
import ColorEngine from "./engine";
import Pywal16 from "./engine/pywal16";
import { generalConfig } from "../../config";
import Notifications from "../notifications";
import { getter, gtype, register, signal } from "ags/gobject";


/** init module, checks which engine it's supposed to use by checking user
  * configuration */
@register({ GTypeName: "ClshColorEngineManager" })
class Color extends GObject.Object {
    private static instance: Color;
    // engine constructors go here!!
    private static engines = [Pywal16];

    #engine!: Color.Engine;
    #connection: number;

    /** triggered when a property is updated and when the engine is updated */
    @signal()
    protected updated() {}

    @getter(gtype<Color.Engine>(GObject.Object))
    get engine() { return this.#engine; }
    protected set engine(newEngine: Color.Engine) {
        this.#engine?.run_dispose();
        this.#engine = newEngine;
        this.#engine.scheme = Color.stringToScheme(generalConfig.getProperty("color.scheme", "string"));
        this.#engine.backend = generalConfig.getProperty("color.backend", "string");
        this.notify("engine");
        this.emit("updated");
    }

    constructor() {
        super();
        const engineName = generalConfig.getProperty("color.engine", "string");
        this.engine = new (Color.getEngineByName(engineName) ?? Pywal16)();

        this.#connection = generalConfig.connect("property-changed", (_, path) => {
            switch(path) {
                case "color.engine": {
                    const engine = Color.getEngineByName(generalConfig.getProperty(path, "string"));
                    if(!engine) {
                        Notifications.getDefault().sendNotification({
                            summary: "Config error",
                            body: `Invalid engine name for "color.engine". Available engines are:${
                                Color.engines.map(b => `"${b.name.toLowerCase()}"`).join(", ")
                            }`
                        });

                        return;
                    } else if(this.#engine instanceof engine)
                        return;

                    this.engine = new engine();
                    break;
                };

                case "color.scheme": {
                    const scheme = generalConfig.getProperty(path, "string") as "light"|"dark";
                    if(scheme !== "dark" && scheme !== "light") {
                        Notifications.getDefault().sendNotification({
                            summary: "Config error",
                            body: `Invalid value for "color.mode". Available modes are: "dark", "light"`
                        });

                        return;
                    }

                    this.#engine.scheme = Color.stringToScheme(scheme);
                    this.emit("updated");
                    break;
                };

                case "color.backend": {
                    const backend = generalConfig.getProperty(path, "string");
                    this.#engine.backend = backend;
                    this.emit("updated");

                    break;
                };
            }
        });
    }

    run_dispose(): void {
        generalConfig.disconnect(this.#connection);
    }

    public static getDefault(): Color {
        return this.instance ??= new this();
    }

    public static getEngine(): Color.Engine {
        return this.getDefault().engine;
    }

    private static getEngineByName(name: string): (new () => Color.Engine)|null {
        return Color.engines.find(b => b.name.toLowerCase() === name) ??
            null;
    }

    public static schemeToString(scheme: Color.Engine.Scheme): "light"|"dark" {
        return scheme === ColorEngine.Scheme.LIGHT ?
            "light"
        : "dark";
    }

    public static stringToScheme(schemeString: string): Color.Engine.Scheme {
        return schemeString === "light" ?
            ColorEngine.Scheme.LIGHT
        : ColorEngine.Scheme.DARK;
    }
}

namespace Color {
    export import Engine = ColorEngine;
}

export default Color;
