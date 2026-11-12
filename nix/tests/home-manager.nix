{
  homeManager,
  module,
  pkgs,
}:
(homeManager.lib.homeManagerConfiguration {
  inherit pkgs;
  modules = [
    module
    {
      home = {
        username = "colorshell-test";
        homeDirectory = "/home/colorshell-test";
        stateVersion = "26.05";
      };

      programs.colorshell = {
        enable = true;
        settings.wallpaper.dirs = [ "/wallpapers" ];
        hyprsunset.enable = false;
      };

      services.hyprpaper.settings.splash = false;
      services.hyprsunset.enable = true;
    }
  ];
}).activationPackage
