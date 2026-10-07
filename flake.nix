{
  description = "Super cool desktop shell for Hyprland!";

  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    corncheese-nix-lib = {
      url = "github:conroy-cheers/corncheese-nix-lib";
      inputs.flake-parts.follows = "flake-parts";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } (
      { withSystem, ... }:
      {
        imports = [
          # To import an internal flake module: ./other.nix
          # To import an external flake module:
          #   1. Add foo to inputs
          #   2. Add foo as a parameter to the outputs function
          #   3. Add here: foo.flakeModule
        ];
        systems = [
          "x86_64-linux"
          "aarch64-linux"
        ];
        perSystem =
          {
            config,
            self',
            pkgs,
            system,
            ...
          }:
          let
            colorshell = pkgs.callPackage ./nix/colorshell.nix {
              fetchBunDeps = inputs.corncheese-nix-lib.lib.fetchBunDeps pkgs;
            };
          in
          {
            checks.home-manager-module = import ./nix/tests/home-manager.nix {
              inherit pkgs;
              homeManager = inputs.home-manager;
              module = import ./nix/home-manager.nix { inherit withSystem; };
            };

            packages = {
              inherit colorshell;
              default = colorshell;
            };

            devShells = import ./nix/devshell.nix { inherit self' pkgs; };
          };
        flake = {
          homeManagerModules.default = import ./nix/home-manager.nix { inherit withSystem; };
          passthru = {
            inherit inputs;
          };
        };
      }
    );
}
