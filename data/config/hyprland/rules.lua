-- colorshell configuration, please don't modify unless you know what you're doing!

hl.layer_rule({
    match = { namespace = "apps-window" };
    animation = "slide bottom";
});
hl.window_rule({
    match = { class = "^(xdg-desktop-portal.*|hyprpolkitagent)" };
    animation = "gnomed";
});
hl.layer_rule({
    match = { namespace = "^(background-window|runner|logout-menu|center-window|control-center|hyprpaper|hyprpicker|selection)" };
    animation = "fade";
});
hl.layer_rule({
    name = "clsh-no-animation";
    match = { namespace = "floating-notifications" };
    no_anim = true
});

hl.layer_rule({
    name = "clsh-top-bar-widget";
    match = { namespace = "^(control-center|center-window|runner|floating-notifications|top-bar)$" };

    blur = true;
    ignore_alpha = 0.55;
});
hl.layer_rule({
    match = { namespace = "^.*-popup$" };
    animation = "fade";

    blur = true;
    ignore_alpha = 0.6;
});

hl.layer_rule({ match = { namespace = "osd" }, blur = true });
hl.layer_rule({ match = { namespace = "apps-window" }, blur = true });
hl.layer_rule({ match = { namespace = "logout-menu" }, blur = true });
hl.layer_rule({ match = { namespace = "osd" }, ignore_alpha = 0.4 });
hl.layer_rule({ match = { namespace = "apps-window" }, ignore_alpha = 0.5 });
hl.layer_rule({ match = { namespace = "logout-menu" }, ignore_alpha = 0 });
