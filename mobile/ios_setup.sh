#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Tamizhi iOS — One-command setup
#
#  Run this once on a Mac with Xcode installed to prepare the iOS build.
#  Requires: Xcode 15+, Ruby 3+, CocoaPods
# ─────────────────────────────────────────────────────────────────────────────

set -e

MOBILE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$MOBILE_DIR"

echo "🍎 Tamizhi iOS Setup"
echo "──────────────────────────────────────"

# ── 1. Check Xcode ────────────────────────────────────────────────────────────
if ! xcode-select -p &>/dev/null; then
  echo "❌ Xcode command-line tools not found."
  echo "   Install via: xcode-select --install"
  exit 1
fi
echo "✅ Xcode: $(xcode-select -p)"

# ── 2. Check Ruby ────────────────────────────────────────────────────────────
RUBY_VER=$(ruby --version 2>/dev/null | cut -d' ' -f2 | cut -d'.' -f1)
if [ "$RUBY_VER" -lt 3 ] 2>/dev/null; then
  echo "⚠️  Ruby 3+ required. Current: $(ruby --version)"
  echo ""
  echo "   Install with Homebrew:"
  echo "     /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  echo "     brew install ruby"
  echo "     echo 'export PATH=\"/opt/homebrew/opt/ruby/bin:\$PATH\"' >> ~/.zshrc"
  echo "     source ~/.zshrc"
  echo ""
  echo "   Then re-run: bash ios_setup.sh"
  exit 1
fi
echo "✅ Ruby: $(ruby --version)"

# ── 3. Install CocoaPods ──────────────────────────────────────────────────────
if ! command -v pod &>/dev/null; then
  echo "📦 Installing CocoaPods…"
  gem install cocoapods --no-document
fi
echo "✅ CocoaPods: $(pod --version)"

# ── 4. Install npm deps ───────────────────────────────────────────────────────
echo "📦 Installing npm dependencies…"
npm install

# ── 5. Run expo prebuild (regenerate ios/ if needed) ─────────────────────────
if [ ! -d "ios/Tamizhi.xcodeproj" ]; then
  echo "🔨 Running expo prebuild…"
  npx expo prebuild --platform ios
fi
echo "✅ Xcode project: ios/Tamizhi.xcodeproj"

# ── 6. Install Pods ───────────────────────────────────────────────────────────
echo "📦 Installing CocoaPods dependencies…"
cd ios
pod install --repo-update
cd ..
echo "✅ Pods installed → ios/Tamizhi.xcworkspace"

# ── 7. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════"
echo "✅  iOS setup complete!"
echo ""
echo "To run on iPhone simulator:"
echo "   npx expo run:ios"
echo ""
echo "To run on a real device:"
echo "   npx expo run:ios --device"
echo ""
echo "To build for App Store (EAS Cloud):"
echo "   eas build --platform ios --profile production"
echo ""
echo "Open in Xcode:"
echo "   open ios/Tamizhi.xcworkspace"
echo "═══════════════════════════════════════"
