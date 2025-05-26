#!/bin/bash

# Complete setup script for GitHub repository
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚀 Modern Desktop Chat UI - Repository Setup"
echo "============================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js first."
    exit 1
fi

print_status "Step 1: Initializing Git repository..."
if [ ! -d ".git" ]; then
    git init
    print_success "Git repository initialized"
else
    print_status "Git repository already exists"
fi

print_status "Step 2: Installing dependencies..."
npm install

echo ""
print_status "Step 3: GitHub repository setup"
echo ""
echo "Now you need to create a GitHub repository:"
echo ""
echo "1. 🌐 Go to: https://github.com/new"
echo "2. 📝 Repository name: modern-desktop-chat-ui"
echo "3. 📖 Description: Modern ChatGPT-inspired desktop chat interface built with Electron"
echo "4. 🔓 Make it Public"
echo "5. ❌ DON'T check 'Add a README file'"
echo "6. ❌ DON'T add .gitignore or license"
echo "7. ✅ Click 'Create repository'"
echo ""

read -p "Press Enter after creating the repository..."
echo ""

read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter your repository name (or press Enter for 'modern-desktop-chat-ui'): " REPO_NAME

if [ -z "$REPO_NAME" ]; then
    REPO_NAME="modern-desktop-chat-ui"
fi

print_status "Step 4: Configuring repository..."

# Update package.json with repository info
cat > package.json << EOF
{
  "name": "modern-desktop-chat-ui",
  "version": "1.0.0",
  "description": "Modern ChatGPT-inspired desktop chat interface built with Electron",
  "main": "main.js",
  "homepage": "https://github.com/$GITHUB_USER/$REPO_NAME",
  "repository": {
    "type": "git",
    "url": "https://github.com/$GITHUB_USER/$REPO_NAME.git"
  },
  "author": "$GITHUB_USER",
  "license": "MIT",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux",
    "dist": "npm run build",
    "pack": "electron-builder --dir",
    "postinstall": "electron-builder install-app-deps"
  },
  "build": {
    "appId": "com.modernui.chat",
    "productName": "Modern Chat UI",
    "directories": {
      "output": "dist"
    },
    "files": [
      "**/*",
      "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
      "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
      "!**/node_modules/*.d.ts",
      "!**/node_modules/.bin",
      "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
      "!.editorconfig",
      "!**/._*",
      "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
      "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
      "!**/{appveyor.yml,.travis.yml,circle.yml}",
      "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "icon": "build/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        }
      ],
      "icon": "build/icon.ico"
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icon.png",
      "category": "Office"
    },
    "publish": {
      "provider": "github",
      "owner": "$GITHUB_USER",
      "repo": "$REPO_NAME"
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.6.4"
  }
}
EOF

print_status "Step 5: Setting up remote repository..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"

print_status "Step 6: Creating initial commit..."
git add .
git commit -m "Initial commit: Modern desktop chat UI with Electron"

print_status "Step 7: Pushing to GitHub..."
git branch -M main
git push -u origin main

print_success "Repository setup complete!"
echo ""
echo "🎉 Your repository is now available at:"
echo "📁 Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "⚡ Actions: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
echo "📦 Releases: https://github.com/$GITHUB_USER/$REPO_NAME/releases"
echo ""
echo "🚀 Next steps:"
echo "1. Test the app locally: npm start"
echo "2. Create your first release: ./scripts/release.sh v1.0.0"
echo "3. Monitor the build: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
echo ""
