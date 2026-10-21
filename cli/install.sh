#!/bin/bash
# Installs the orca command:
#   curl -fsSL https://raw.githubusercontent.com/nicolekc/orca/main/cli/install.sh | bash
#
# Downloads this machine's build from the repo's "cli" release, checks it against its
# published checksum, and puts it in the first of these folders that's on PATH and
# writable: /opt/homebrew/bin, /usr/local/bin, ~/.local/bin. Afterwards `orca update`
# keeps it current.
set -euo pipefail

RELEASE="https://github.com/nicolekc/orca/releases/download/cli"

os=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$(uname -m)" in
    arm64|aarch64) arch=arm64 ;;
    x86_64) arch=x64 ;;
    *) echo "✗ No orca build for $(uname -m)." >&2; exit 1 ;;
esac
asset="orca-$os-$arch"

dir=""
for d in /opt/homebrew/bin /usr/local/bin "$HOME/.local/bin"; do
    case ":$PATH:" in *":$d:"*) if [ -w "$d" ]; then dir="$d"; break; fi ;; esac
done
if [ -z "$dir" ]; then
    echo "✗ None of /opt/homebrew/bin, /usr/local/bin, ~/.local/bin is on your PATH and writable." >&2
    echo "  Add ~/.local/bin to PATH (in ~/.zshrc: export PATH=\"\$HOME/.local/bin:\$PATH\"), then run this again." >&2
    exit 1
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
echo "Downloading orca for $os-$arch (about 70 MB; GitHub can take a minute)…"
curl -fL --progress-bar "$RELEASE/$asset" -o "$tmp/orca"
curl -fsSL "$RELEASE/$asset.sha256" -o "$tmp/orca.sha256"
echo "Checking it against its published checksum…"

expected=$(cut -d' ' -f1 "$tmp/orca.sha256")
if command -v sha256sum >/dev/null; then actual=$(sha256sum "$tmp/orca" | cut -d' ' -f1)
else actual=$(shasum -a 256 "$tmp/orca" | cut -d' ' -f1); fi
if [ "$actual" != "$expected" ]; then
    echo "✗ The download doesn't match its published checksum; not installing it." >&2
    exit 1
fi

chmod 755 "$tmp/orca"
mv "$tmp/orca" "$dir/orca"
echo "Installed in $dir. Running it once (macOS checks a new program first, which can take a moment)…"
echo "✓ orca $("$dir/orca" --version)"
echo "  Try: orca --help"
