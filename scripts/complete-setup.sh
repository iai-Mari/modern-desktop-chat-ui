#!/bin/bash

# Complete setup script for GitHub repository and deployment
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

echo "🚀 Modern Desktop Chat UI - Complete Setup"
echo "=========================================="
echo ""

# Step 1: Check current status
print_status "Step 1: Checking current repository status..."
./scripts/find-repo.sh

echo ""
read -p "Do you need to create a new GitHub repository? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_status "Step 2: Creating GitHub repository..."
    echo ""
    echo "Please follow these steps:"
    echo ""
    echo "1. 🌐 Go to: https://github.com/new"
    echo "2. 📝 Repository name: modern-desktop-chat-ui (or your preferred name)"
    echo "3. 📖 Description: Modern ChatGPT-inspired desktop chat interface built with Electron"
    echo "4. 🔓 Make it Public"
    echo "5. ❌ DON'T check 'Add a README file' (we already have one)"
    echo "6. ❌ DON'T add .gitignore or license (we have them)"
    echo "7. ✅ Click 'Create repository'"
    echo ""
    
    read -p "Press Enter after creating the repository..."
    echo ""
    
    read -p "Enter your GitHub username: " GITHUB_USER
    read -p "Enter your repository name: " REPO_NAME
    
    # Set up remote
    git remote remove origin 2>/dev/null || true
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
    
    print_status "Step 3: Pushing code to GitHub..."
    git branch -M main
    git add .
    git commit -m "Initial commit: Modern desktop chat UI with Electron" || true
    git push -u origin main
    
    print_success "Repository created and code pushed!"
    echo ""
    echo "🎉 Your repository is now available at:"
    echo "📁 Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
    echo "⚡ Actions: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
    echo "📦 Releases: https://github.com/$GITHUB_USER/$REPO_NAME/releases"
fi

echo ""
print_status "Step 4: Updating package.json with correct repository info..."

# Get current remote URL
REMOTE_URL=$(git remote get-url origin)
if [[ $REMOTE_URL =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
    GITHUB_USER="${BASH_REMATCH[1]}"
    REPO_NAME="${BASH_REMATCH[2]}"
    
    # Update package.json
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
  "author": "Your Name",
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
    "appId": "com.yourcompany.modern-chat-ui",
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

    print_success "package.json updated with repository info"
    
    # Commit the changes
    git add package.json
    git commit -m "Update package.json with correct repository information" || true
    git push origin main
    
    print_success "Changes pushed to GitHub"
fi

echo ""
print_status "Step 5: Final repository information..."
echo ""
echo "🎉 Setup Complete! Your repository URLs:"
echo "📁 Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "⚡ Actions: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
echo "📦 Releases: https://github.com/$GITHUB_USER/$REPO_NAME/releases"
echo ""
echo "🚀 Next steps:"
echo "1. Create your first release: ./scripts/release.sh v1.0.0"
echo "2. Monitor the build: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
echo "3. Download your app: https://github.com/$GITHUB_USER/$REPO_NAME/releases"
echo ""
