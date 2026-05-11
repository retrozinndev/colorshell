-- colorshell-specific configuration, please don't modify unless you know what you're doing!

-- TODO detect if a bind already executes the same command before binding
hl.bind("SUPER + SPACE", hl.dsp.exec_cmd("colorshell runner"));

hl.bind(" + Print", hl.dsp.exec_cmd("colorshell screenshot"));
hl.bind("ALT + Print", hl.dsp.exec_cmd("colorshell screenshot active"));
hl.bind("SUPER + Print", hl.dsp.exec_cmd("colorshell screenshot full"));

hl.bind("SUPER + F7", hl.dsp.exec_cmd("colorshell reload"));

hl.bind("SUPER + N", hl.dsp.exec_cmd("colorshell toggle -w control-center"));
hl.bind("SUPER + M", hl.dsp.exec_cmd("colorshell toggle -w center-window"));
hl.bind("SUPER + L", hl.dsp.exec_cmd("colorshell lock"));
hl.bind("SUPER + V", hl.dsp.exec_cmd("colorshell runner -t '\\>'"));
hl.bind("SUPER + W", hl.dsp.exec_cmd("colorshell runner -t '\\##'"));

hl.bind("SUPER + SUPER_L", hl.dsp.exec_cmd("colorshell peek-workspaces"));

hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd("colorshell volume -d sink -m 5"), { repeating = true });
hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd("colorshell volume -d sink -p 5"), { repeating = true });
hl.bind("XF86AudioMute", hl.dsp.exec_cmd("colorshell volume -d sink mute"));
hl.bind("XF86AudioPrev", hl.dsp.exec_cmd("colorshell media previous"));
hl.bind("XF86AudioNext", hl.dsp.exec_cmd("colorshell media next"));
hl.bind("XF86AudioPlay", hl.dsp.exec_cmd("colorshell media play-pause"));

hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd("brightnessctl -c backlight s 5%-"));
hl.bind("XF86MonBrightnessUp", hl.dsp.exec_cmd("brightnessctl -c backlight s +5%"));
