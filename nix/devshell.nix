{
  self',
  pkgs,
}:
let
  colorshell = self'.packages.colorshell;

  packages = [
  ];

  devPackages = with pkgs; [
    bun

    # dev scripts
    jq

    # pywal16
    pywal16
    imagemagick
  ];

  colorshellDeps = pkgs.stdenvNoCC.mkDerivation {
    name = "colorshell-node-modules";
    nativeBuildInputs = [
      pkgs.bun
      colorshell.bunNode
    ];
    dontUnpack = true;
    installPhase = ''
      project="$TMPDIR/project"
      cache="$TMPDIR/bun-cache"
      mkdir -p "$project" "$cache"
      cp ${../package.json} "$project/package.json"
      cp ${../bun.lock} "$project/bun.lock"
      cp -R "${colorshell.bunDeps}/." "$cache/"
      chmod -R u+w "$project" "$cache"

      export BUN_INSTALL_CACHE_DIR="$cache"
      export BUN_INSTALL_GLOBAL_STORE=0

      cd "$project"
      bun install \
        --config="${colorshell.bunDeps.bunfig}" \
        --offline \
        --frozen-lockfile \
        --ignore-scripts \
        --backend=copyfile \
        --no-progress

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
      if [ -e ./node_modules ] && [ ! -L ./node_modules ]; then
        echo "Refusing to replace the existing node_modules directory" >&2
        return 1
      fi
      echo "Linking $NODE_MODULES_PATH to $PWD/node_modules..."
      ln -sfn "$NODE_MODULES_PATH" ./node_modules
    '';

    passthru = {
      inherit colorshellDeps;
    };
  };
}
