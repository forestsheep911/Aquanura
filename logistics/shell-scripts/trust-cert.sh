#!/bin/bash

CERT_PATH="$HOME/Library/Application Support/plugin-craft-kit/rootCA.pem"

echo "🔐 Trust certificate to system keychain..."
echo ""
echo "Please enter your computer login password:"
sudo security add-trusted-cert -d -r trustRoot -k '/Library/Keychains/System.keychain' -p ssl -p basic "$CERT_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificate trusted successfully!"
    echo ""
    echo "🔍 Verifying certificate in trust store..."
    security find-certificate -c "plugin-craft-kit" /Library/Keychains/System.keychain

    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Certificate verified! You can now run the dev server."
        echo ""
        echo "Start command:"
        echo "  pnpm dev"
    else
        echo ""
        echo "⚠️ Certificate may not have been added. Check the output above."
    fi
else
    echo ""
    echo "❌ Certificate trust failed. Password may be incorrect or other issue."
    echo ""
    echo "Try running manually:"
    echo "  sudo security add-trusted-cert -d -r trustRoot -k '/Library/Keychains/System.keychain' -p ssl -p basic '$CERT_PATH'"
fi
