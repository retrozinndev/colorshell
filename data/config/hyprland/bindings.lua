-- colorshell-specific configuration, please don't modify unless you know what you're doing!

---@class HL.BindParams
---@field cmd string
---@field dsp HL.Dispatcher
---@field opts? HL.BindOptions
local __HLBindParams = {};

-- TODO detect if a bind already executes the same command before binding
---@type HL.BindParams[]
local binds = {
    { cmd = "Print", dsp = hl.dsp.exec_cmd("colorshell screenshot") },
    { cmd = "ALT + Print", dsp = hl.dsp.exec_cmd("colorshell screenshot active") },
    { cmd = "SUPER + Print", dsp = hl.dsp.exec_cmd("colorshell screenshot full") },
    { cmd = "SUPER + F7", dsp = hl.dsp.exec_cmd("colorshell reload") },

    { cmd = "SUPER + SPACE", dsp = hl.dsp.exec_cmd("colorshell runner") },
    { cmd = "SUPER + N", dsp = hl.dsp.exec_cmd("colorshell toggle -w control-center") },
    { cmd = "SUPER + M", dsp = hl.dsp.exec_cmd("colorshell toggle -w center-window") },
    { cmd = "SUPER + L", dsp = hl.dsp.exec_cmd("colorshell lock") },
    { cmd = "SUPER + V", dsp = hl.dsp.exec_cmd("colorshell runner -t '\\>'") },
    { cmd = "SUPER + W", dsp = hl.dsp.exec_cmd("colorshell runner -t '\\#'") },
    { cmd = "SUPER + SUPER_L", dsp = hl.dsp.exec_cmd("colorshell peek-workspaces") },

    { cmd = "XF86AudioLowerVolume", dsp = hl.dsp.exec_cmd("colorshell volume -d sink -m 5"), opts = { repeating = true } },
    { cmd = "XF86AudioRaiseVolume", dsp = hl.dsp.exec_cmd("colorshell volume -d sink -p 5"), opts = { repeating = true } },
    { cmd = "XF86AudioMute", dsp = hl.dsp.exec_cmd("colorshell volume -d sink mute") },
    { cmd = "XF86AudioPrev", dsp = hl.dsp.exec_cmd("colorshell media previous") },
    { cmd = "XF86AudioNext", dsp = hl.dsp.exec_cmd("colorshell media next") },
    { cmd = "XF86AudioPlay", dsp = hl.dsp.exec_cmd("colorshell media play-pause") },

    { cmd = "XF86MonBrightnessDown", dsp = hl.dsp.exec_cmd("brightnessctl -c backlight s 5%-") },
    { cmd = "XF86MonBrightnessUp", dsp = hl.dsp.exec_cmd("brightnessctl -c backlight s +5%") }
};

for _, bind in ipairs(binds) do
    hl.bind(bind.cmd, bind.dsp, bind.opts);
end
