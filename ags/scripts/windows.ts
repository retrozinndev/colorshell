// get open windows / interact with windows(e.g.: close, open or toggle)

import { Widget } from "astal/gtk3";
import { getWindowsMap } from "../app";

export class Windows {
    private static inst: Windows = new Windows();

    private readonly windows = getWindowsMap();

    public static getDefault(): Windows {
        return Windows.inst;
    }

    public getWindows(): typeof this.windows {
        return this.windows;
    }

    public open(window: Widget.Window): void {
        window.show();
    }

    public isVisible(window: Widget.Window): boolean {
        return window.get_visible();
    }

    public close(window: Widget.Window): void {
        window.hide();
    }

    public toggle(window: Widget.Window): void {
        window.is_visible() ? this.close(window) : this.open(window);
    }
}
