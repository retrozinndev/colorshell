{ withSystem }:
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.programs.colorshell;
  jsonFormat = pkgs.formats.json { };
in
{
  meta.maintainers = [ ];

  options.programs.colorshell = {
    enable = lib.mkEnableOption "colorshell, a desktop shell";

    package =
      lib.mkPackageOption (withSystem pkgs.stdenv.hostPlatform.system ({ config, ... }: config.packages))
        "colorshell"
        {
          default = "colorshell";
          pkgsText = "inputs.colorshell.packages.\${pkgs.stdenv.hostPlatform.system}";
        };

    settings = lib.mkOption {
      type = jsonFormat.type;
      default = { };
      example = lib.literalExpression ''
        {
          color = {
            engine = "static";
            static =
              let
                colors = config.lib.stylix.colors.withHashtag;
                translucent = color: "oklch(from ''${color} l c h / .68)";
              in
              {
                bg_primary = colors.base00;
                bg_secondary = colors.base01;
                bg_tertiary = colors.base02;
                bg_translucent_primary = translucent colors.base00;
                bg_translucent_secondary = translucent colors.base01;
                bg_translucent_tertiary = translucent colors.base02;
                fg_primary = colors.base05;
                fg_disabled = colors.base04;
              };
          };

          misc.match_window_border_color = false;
        }
      '';
      description = ''
        colorshell configuration written to
        `~/.config/colorshell/config.json`. Unspecified settings use
        colorshell's built-in defaults.
      '';
    };

    hyprpaper.enable = lib.mkEnableOption "Hyprpaper wallpaper rendering" // {
      default = true;
    };

    hyprsunset.enable = lib.mkEnableOption "Hyprsunset night-light control" // {
      default = true;
    };

    hyprlock = {
      enable = lib.mkEnableOption "Colorshell's default Hyprlock configuration" // {
        default = true;
      };
    };
  };

  config = lib.mkIf cfg.enable {
    home.packages = [ cfg.package ];

    services.hyprpaper.enable = lib.mkIf cfg.hyprpaper.enable true;
    services.hyprsunset.enable = lib.mkIf cfg.hyprsunset.enable true;

    xdg.configFile."colorshell/config.json".source =
      jsonFormat.generate "colorshell-config.json" cfg.settings;

    programs.hyprlock = lib.mkIf cfg.hyprlock.enable {
      enable = lib.mkDefault true;
      extraConfig = lib.mkDefault (
        builtins.replaceStrings
          [ "@colorshellPalette@" ]
          [ "${config.xdg.cacheHome}/colorshell/colorends/pywal16/colors-hyprland.conf" ]
          (builtins.readFile ../data/config/hyprlock.conf)
      );
    };

    systemd.user.services.colorshell = {
      Unit = {
        Description = "colorshell";
        ConditionEnvironment = "WAYLAND_DISPLAY";
        PartOf = [ config.wayland.systemd.target ];
        After = [ config.wayland.systemd.target ];
        X-Restart-Triggers = [ config.xdg.configFile."colorshell/config.json".source ];
      };

      Service = {
        ExecStart = lib.getExe cfg.package;
        Restart = "on-failure";
      };

      Install.WantedBy = [ config.wayland.systemd.target ];
    };
  };
}
