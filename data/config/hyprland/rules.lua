-- colorshell configuration, please don't modify unless you know what you're doing!

-- Animations
hl.window_rule({
    match = { class = "hyprpolkitagent" };
    animation = "gnomed"
});
hl.window_rule({
    match = { class = "xdg-desktop-portal.*" };
    animation = "gnomed";
});
hl.layer_rule({
    match = { namespace = "selection" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = "hyprpicker" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = "hyprpaper" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = "apps-window" };
    animation = "slide bottom";
});
hl.layer_rule({
    match = { namespace = "control-center" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = "center-window" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = "logout-menu" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = "runner" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = "background-window" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = "background-window-blur" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = ".*-popup" };
    animation = "fade";
});
hl.layer_rule({
    match = { namespace = "floating-notifications" };
    no_anim = true
});

-- Blur
hl.layer_rule({
    name = "clsh-top-bar-widget";
    match = { namespace = "top-bar" };

    blur = true;
    ignore_alpha = 0.55;
});
hl.layer_rule({
    name = "clsh-popup-widgets-1";
    match = {
        namespace = "^(control-center|center-window|runner|floating-notifications)$";
    };

    blur = true;
    ignore_alpha = 0.7;
});
hl.layer_rule({
    name = "clsh-popup-widgets-2";
    match = { namespace = "^.*-popup$" };

    blur = true;
    ignore_alpha = 0.6;
});

hl.layer_rule({ match = { namespace = "osd" }, blur = true });
hl.layer_rule({ match = { namespace = "apps-window" }, blur = true });
hl.layer_rule({ match = { namespace = "logout-menu" }, blur = true });
hl.layer_rule({ match = { namespace = "osd" }, ignore_alpha = 0.4 });
hl.layer_rule({ match = { namespace = "apps-window" }, ignore_alpha = 0.5 });
hl.layer_rule({ match = { namespace = "logout-menu" }, ignore_alpha = 0 });
