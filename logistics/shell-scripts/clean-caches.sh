#!/bin/bash

echo "🧹 System and browser cache cleanup"
echo "===================================="

echo ""
echo "🔄 Clearing system DNS cache..."
sudo killall -HUP mDNSResponder 2>/dev/null || echo "mDNSResponder cleared"

echo ""
echo "🔄 Clearing system certificate cache..."
sudo security delete-internet-password -s localhost 2>/dev/null || echo "Certificate cache cleared"

echo ""
echo "📋 Cleanup complete!"
echo ""
echo "💡 Now please:"
echo "1. Open your browser"
echo "2. Clear browser cache and cookies"
echo "3. Restart browser"
echo "4. Visit: https://localhost:5173"

echo ""
echo "🎯 If still having issues, try:"
echo "• Clear browser certificate cache (varies by browser)"
echo "• Check firewall or proxy settings"
echo "• Try a different port"

echo ""
echo "✨ Cleanup complete! You can restart your browser and access the dev server now."
