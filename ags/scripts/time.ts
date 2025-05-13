import { GLib, Variable } from "astal";

const time = new Variable<GLib.DateTime>(GLib.DateTime.new_now_local()).poll(500, () => 
    GLib.DateTime.new_now_local())();

export const getDateTime = () => time;
