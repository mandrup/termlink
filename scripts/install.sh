#!/bin/sh
set -e
cd "$(dirname "$0")"

if command -v xattr >/dev/null 2>&1; then
  xattr -cr . 2>/dev/null || true
fi

INSTALL_DIR="${TERMLINK_INSTALL_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/termlink}"
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -R dist node_modules "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/dist/index.js"

BIN_DIR="${TERMLINK_BIN_DIR:-$HOME/.local/bin}"
mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/dist/index.js" "$BIN_DIR/termlink"

echo "Installed termlink -> $INSTALL_DIR (linked from $BIN_DIR/termlink)"
echo "This extracted folder can now be deleted -- termlink no longer needs it."

case ":$PATH:" in
  *":$BIN_DIR:"*)
    echo "Run 'termlink' to start."
    ;;
  *)
    echo "$BIN_DIR isn't on your PATH yet. Add this to your shell profile (e.g. ~/.zshrc):"
    echo "  export PATH=\"$BIN_DIR:\$PATH\""
    echo "Then reload your shell and run 'termlink'."
    ;;
esac
