-- colorshell-specific configuration, please don't modify unless you know what you're doing!

-- TODO native blur, so we won't be depending on Hyprland

local cacheHome = os.getenv("XDG_CACHE_HOME");
local home = os.getenv("HOME");
if cacheHome == nil or cacheHome == home then
    cacheHome = home .. "/.cache"
end

---@param summary string
---@param body string
local function notify(summary, body)
    hl.exec_cmd("notify-send -a io.github.retrozinndev.Colorshell \"" .. summary .. "\" \"" .. body .. "\"");
end

local wal, err = loadfile(cacheHome .. "/wal/colors.lua");
local colors = {};
if wal ~= nil then
    colors = wal();
else
    notify("Pywal error", "Couldn't load pywal colors to hyprland:\n" .. err);
end

hl.config {
    general = {
        ["col.active_border"] = colors.color1;
        ["col.inactive_border"] = colors.background;
    };

    decoration = {
        shadow = {
            color = colors.background;
        };
    };
}
