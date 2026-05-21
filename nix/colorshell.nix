{
  inputs',
  lib,
  stdenv,
  stdenvNoCC,
  moreutils,
  pnpmConfigHook,
  fetchPnpmDeps,
  pnpm_10,
  buildNpmPackage,
  wrapGAppsHook4,
  gobject-introspection,
  glib,
  gjs,
  libadwaita,
  socat,
  libglycin-gtk4,
  glycin-loaders,
  jq,
}:
let
  packageJSON = lib.importJSON ../package.json;
  appid = "io.github.retrozinndev.Colorshell";
  pname = packageJSON.name;
  version = packageJSON.version;

  # Cleaned sources from this repository
  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.difference ../. (
      lib.fileset.unions [
        ../flake.nix
        ../flake.lock
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

    # Replace reference to ags FHS install path
    postPatch = ''
      substituteInPlace package.json pnpm-lock.yaml \
        --replace-fail "/usr/share/ags/js" "${inputs'.ags.packages.ags.jsPackage}"
    '';

    installPhase = ''
      mkdir $out
      cp -rp * $out
    '';
  };
in
buildNpmPackage (finalAttrs: {
  inherit pname version;

  src = colorshellSrc;
  sourceRoot = "${finalAttrs.src.name}";

  npmConfigHook = pnpmConfigHook;
  npmDeps = finalAttrs.pnpmDeps;
  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs)
      pname
      version
      src
      sourceRoot
      ;

    nativeBuildInputs = [ pnpm_10 ];

    fetcherVersion = 2;
    hash = "sha256-P7Nmpww+BPPcjPt1kjw9zTfARP2GajZJCCQhicMZbFY=";

    # fetcher version 2 fails if there are no *-exec files in the output
    preFixup = ''
      touch $out/.dummy-exec
    '';
  };

  nativeBuildInputs = [
    pnpm_10
    wrapGAppsHook4
    gobject-introspection
    inputs'.ags.packages.default
    moreutils
    jq
  ];

  buildInputs = [
    glib
    gjs
    libadwaita
    libglycin-gtk4
    glycin-loaders
    inputs'.astal.packages.astal4
    inputs'.astal.packages.apps
    inputs'.astal.packages.auth
    inputs'.astal.packages.battery
    inputs'.astal.packages.bluetooth
    inputs'.astal.packages.hyprland
    inputs'.astal.packages.io
    inputs'.astal.packages.mpris
    inputs'.astal.packages.network
    inputs'.astal.packages.notifd
    inputs'.astal.packages.tray
    inputs'.astal.packages.wireplumber
  ];

  buildPhase = ''
    runHook preBuild

    mkdir build
    outPath=./build/${packageJSON.name}
    pnpm build -rjg \$COLORSHELL_GRESOURCE -o ./build

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
          glib
          socat
        ]
      }
    )
  '';

  passthru = {
    resources = colorshellResources;
  };
})
