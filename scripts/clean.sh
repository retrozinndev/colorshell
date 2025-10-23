set -e

builddir="${1:-./build}"

echo "[info] cleaning build dir: \"$builddir\""
rm -r "$builddir"
