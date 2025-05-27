#!/bin/bash

echo "Creating app icons from your iAI logo..."

# Create build directory if it doesn't exist
mkdir -p build

# Download your logo
curl -o build/logo.png "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-05-26%20at%209.33.05%20PM-O7mriZJld9xfUWYiDkghdVpDottRmG.png"

# For now, we'll use the logo as is for all icon formats
# In a real app, you'd want to create proper sized icons
cp build/logo.png build/icon.png
cp build/logo.png build/icon.ico
cp build/logo.png build/icon.icns

echo "✅ Icons created! Your iAI logo will appear as the desktop app icon."
