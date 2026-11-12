{
  astal,
  bun,
  fetchBunDeps,
  fetchFromGitHub,
  lib,
  runCommand,
  stdenv,
  stdenvNoCC,
  moreutils,
  wrapGAppsHook4,
  bash,
  bluez,
  brightnessctl,
  cliphist,
  coreutils,
  gobject-introspection,
  glib,
  grim,
  gtk4-layer-shell,
  gjs,
  hyprland,
  hyprlock,
  hyprpaper,
  hyprpicker,
  hyprsunset,
  libadwaita,
  libnotify,
  networkmanager,
  networkmanagerapplet,
  polkit,
  procps,
  pywal,
  socat,
  slurp,
  systemd,
  uwsm,
  wf-recorder,
  wl-clipboard,
  xdg-utils,
  zenity,
  libglycin-gtk4,
  glycin-loaders,
  jq,
}:
let
  packageJSON = lib.importJSON ../package.json;
  appid = "io.github.retrozinndev.Colorshell";
  pname = packageJSON.name;
  version = packageJSON.version;

  # Let Node-shebang build tools run through Bun, including direct CLI calls.
  bunNode = runCommand "bun-node-${bun.version}" { } ''
    mkdir -p "$out/bin"
    ln -s ${lib.getExe bun} "$out/bin/node"
  '';

  # Cleaned sources from this repository
  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.difference ../. (
      lib.fileset.unions [
        (lib.fileset.maybeMissing ../build)
        ../flake.nix
        ../flake.lock
        (lib.fileset.maybeMissing ../node_modules)
        (lib.fileset.maybeMissing ../result)
        ./.
      ]
    );
  };

  # Derivation building just the gresources file
  colorshellResources = stdenv.mkDerivation {
    pname = "${pname}-resources.gresource";
    inherit version;

    inherit src;

    buildInputs = [
      glib
    ];

    buildPhase = ''
      runHook preBuild

      glib-compile-resources data/${appid}.gresource.xml \
        --sourcedir ./data \
        --target resources.gresource

      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall

      cp resources.gresource $out

      runHook postInstall
    '';
  };

  # Cleaned sources, with FHS paths patched out.
  colorshellSrc = stdenvNoCC.mkDerivation {
    pname = "${pname}-src";
    inherit version;

    inherit src;

    postPatch = ''
      substituteInPlace scripts/build.sh \
        --replace-fail '#!/usr/bin/env bash' '#!${lib.getExe bash}' \
        --replace-fail '#!/usr/bin/env -S gjs -m' '#!${lib.getExe gjs} -m' \
        --replace-fail \
          "LD_PRELOAD='/usr/lib/libgtk4-layer-shell.so'" \
          "LD_PRELOAD='${gtk4-layer-shell}/lib/libgtk4-layer-shell.so'"
      substituteInPlace src/modules/wallpaper.ts \
        --replace-fail '/usr/share/hypr/wall2.png' '${hyprland}/share/hypr/wall2.png'
    '';

    installPhase = ''
      mkdir $out
      cp -rp * $out
    '';
  };

  bunDeps = fetchBunDeps {
    lockFile = ../bun.lock;
    name = "${pname}-bun-cache";

    sourceOverrides = {
      "@GH@Aylur-ags-bbee2f1@@@1" = fetchFromGitHub {
        owner = "Aylur";
        repo = "ags";
        rev = "bbee2f18939f1ec7ff720e717cf305e73635628f";
        hash = "sha256-tM3s7CX+tgxlYW0Sk3nzVThg2MHn08foIuMxABupxIs=";
      };
      "@GH@retrozinndev-gnim-utils-fec7b6e@@@1" = fetchFromGitHub {
        owner = "retrozinndev";
        repo = "gnim-utils";
        rev = "fec7b6ed11a663cca217c861ba78a2e48ea52ac7";
        hash = "sha256-tP7pA6FfffPLl24HxomwoF9RSkxC4Ob27u7SKiaKeDs=";
      };
    };
  };
in
stdenv.mkDerivation (finalAttrs: {
  inherit pname version;

  src = colorshellSrc;
  sourceRoot = "${finalAttrs.src.name}";

  nativeBuildInputs = [
    bun
    bunNode
    wrapGAppsHook4
    gobject-introspection
    moreutils
    jq
  ];

  buildInputs = [
    glib
    gjs
    libadwaita
    libglycin-gtk4
    glycin-loaders
    networkmanager
    astal.astal4
    astal.apps
    astal.auth
    astal.battery
    astal.bluetooth
    astal.hyprland
    astal.io
    astal.mpris
    astal.network
    astal.notifd
    astal.tray
    astal.wireplumber
  ];

  configurePhase = ''
    runHook preConfigure

    mkdir -p "$TMPDIR/bun-cache"
    cp -R "${bunDeps}/." "$TMPDIR/bun-cache/"
    chmod -R u+w "$TMPDIR/bun-cache"

    export BUN_INSTALL_CACHE_DIR="$TMPDIR/bun-cache"
    export BUN_INSTALL_GLOBAL_STORE=0

    bun install \
      --config="${bunDeps.bunfig}" \
      --offline \
      --frozen-lockfile \
      --ignore-scripts \
      --backend=copyfile \
      --no-progress

    runHook postConfigure
  '';

  buildPhase = ''
    runHook preBuild

    mkdir build
    outPath=./build/${packageJSON.name}
    bun run build -- -rjg \$COLORSHELL_GRESOURCE -o ./build

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

      mkdir -p $out/bin
      mkdir -p $out/share/${pname}
      cp -rp build/${packageJSON.name} $out/bin/
      cp ${colorshellResources} $out/share/${pname}/resources.gresource

    runHook postInstall
  '';

  preFixup = ''
    gappsWrapperArgs+=(
      --set COLORSHELL_GRESOURCE "$out/share/${pname}/resources.gresource"
      --prefix PATH : ${
        lib.makeBinPath [
          # runtime executables
          bash
          bluez
          brightnessctl
          cliphist
          coreutils
          glib
          grim
          gtk4-layer-shell
          hyprland
          hyprlock
          hyprpaper
          hyprpicker
          hyprsunset
          libnotify
          networkmanager
          networkmanagerapplet
          polkit
          procps
          pywal
          socat
          slurp
          systemd
          uwsm
          wf-recorder
          wl-clipboard
          xdg-utils
          zenity
        ]
      }
    )
  '';

  meta.mainProgram = "colorshell";

  passthru = {
    inherit bunDeps bunNode;
    resources = colorshellResources;
  };
})
