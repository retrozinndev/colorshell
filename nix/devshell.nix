{
  self',
  pkgs,
}:
let
  colorshell = self'.packages.colorshell;

  packages = [
  ];

  devPackages = with pkgs; [
    nodePackages.nodejs
    pnpm

    # dev scripts
    jq

    # pywal16
    pywal16
    imagemagick
  ];

  colorshellDeps = pkgs.stdenvNoCC.mkDerivation {
    inherit (colorshell.pnpmDeps) name src;
    inherit (colorshell) pnpmDeps sourceRoot;

    buildInputs = [ colorshell.npmConfigHook ];
    installPhase = ''
      mkdir -p $out/lib
      cp -rp node_modules $out/lib/node_modules
    '';
  };
in
{
  default = pkgs.mkShell {
    inputsFrom = [ colorshell ];
    packages = devPackages ++ packages;

    shellHook = ''
      NODE_MODULES_PATH="${colorshellDeps}/lib/node_modules"
      if [ -L ./node_modules ] || [ -e ./node_modules ]; then
        rm -rf ./node_modules
      fi
      echo "Linking $NODE_MODULES_PATH" to $PWD/node_modules...
      ln -s $NODE_MODULES_PATH .
    '';

    passthru = {
      inherit colorshellDeps;
    };
  };
}
