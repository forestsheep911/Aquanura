#!/bin/bash

echo "🔍 Final certificate verification"
echo "=================================="

CERT_PATH="$HOME/Library/Application Support/plugin-craft-kit/rootCA.pem"

# Get certificate hash
CERT_HASH=$(openssl x509 -in "$CERT_PATH" -hash -noout 2>/dev/null)
CERT_CN=$(openssl x509 -in "$CERT_PATH" -subject -noout 2>/dev/null | grep -o 'CN=[^,]*' | cut -d'=' -f2)

echo "Certificate path: $CERT_PATH"
echo "Certificate hash: $CERT_HASH"
echo "Certificate Common Name: $CERT_CN"
echo ""

# Check if certificate is in system trust store
echo "🔍 Checking system trust store..."
CERT_COUNT=$(security find-certificate -a /Library/Keychains/System.keychain 2>/dev/null | grep -c "plugin-craft-kit\|Developer" || echo "0")

if [ "$CERT_COUNT" -gt "0" ]; then
    echo "✅ Certificate found in system trust store"
    echo "📋 Certificate details:"
    security find-certificate -a /Library/Keychains/System.keychain | grep -A5 -B5 "plugin-craft-kit\|Developer"

    echo ""
    echo "🎉 You can start the dev server now:"
    echo "   pnpm dev"
else
    echo "❌ Certificate not found in system trust store"
    echo ""
    echo "🔧 Manual solution:"
    echo "1. Open Keychain Access app"
    echo "2. Drag the certificate file to 'System' keychain"
    echo "3. Double-click the certificate, select 'Trust' section"
    echo "4. Change all options to 'Always Trust'"
fi

echo ""
echo "💡 Tip: After trusting the certificate, clear browser cache if you still see warnings"
