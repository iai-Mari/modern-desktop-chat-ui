# Deployment Guide

This guide explains how to set up automated builds and releases for the iAI Chat Interface.

## Prerequisites

1. **GitHub Repository**: Your code must be in a GitHub repository
2. **Node.js 18+**: Required for building the application
3. **Git**: For version control and tagging

## Setup Steps

### 1. Repository Setup

1. Push your code to GitHub:
\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/iai-chat-interface.git
git push -u origin main
\`\`\`

### 2. GitHub Secrets Configuration

Go to your repository settings → Secrets and variables → Actions, and add these secrets:

#### Required Secrets:
- `GITHUB_TOKEN`: Automatically provided by GitHub (no action needed)

#### Optional Secrets (for code signing):

**For macOS Code Signing:**
- `CSC_LINK`: Base64 encoded .p12 certificate file
- `CSC_KEY_PASSWORD`: Password for the .p12 certificate
- `APPLE_ID`: Your Apple ID email
- `APPLE_ID_PASS`: App-specific password for your Apple ID
- `APPLE_TEAM_ID`: Your Apple Developer Team ID

**For Windows Code Signing:**
- `WIN_CSC_LINK`: Base64 encoded .p12 certificate file
- `WIN_CSC_KEY_PASSWORD`: Password for the certificate

### 3. Create App Icons

Create a `build/` directory and add these icon files:

\`\`\`
build/
├── icon.icns          # macOS icon (512x512)
├── icon.ico           # Windows icon (256x256)
├── icon.png           # Linux icon (512x512)
└── dmg-background.png # macOS DMG background (540x380)
\`\`\`

You can use online tools like [IconGenerator](https://icongenerator.net/) to create these from a single PNG.

### 4. Update package.json

Update the repository URL in your `package.json`:

\`\`\`json
{
  "homepage": "https://github.com/yourusername/iai-chat-interface",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/iai-chat-interface.git"
  },
  "build": {
    "publish": {
      "provider": "github",
      "owner": "yourusername",
      "repo": "iai-chat-interface"
    }
  }
}
\`\`\`

## Creating a Release

### Method 1: Using the Release Script

\`\`\`bash
# Make the script executable
chmod +x scripts/release.sh

# Create a new release
./scripts/release.sh v1.0.0
\`\`\`

### Method 2: Manual Release

\`\`\`bash
# Update version in package.json
npm version 1.0.0 --no-git-tag-version

# Commit the version bump
git add package.json
git commit -m "chore: bump version to v1.0.0"

# Create and push tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main
git push origin v1.0.0
\`\`\`

### Method 3: GitHub Web Interface

1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Choose "Create new tag" and enter `v1.0.0`
4. Fill in the release title and description
5. Click "Publish release"

## Build Process

When you create a tag starting with `v`, GitHub Actions will:

1. **Build for all platforms**: macOS (Intel + Apple Silicon), Windows (x64 + x86), Linux (x64)
2. **Code sign** (if certificates are configured)
3. **Create installers**: DMG for macOS, NSIS installer for Windows, AppImage for Linux
4. **Create GitHub release** with all build artifacts
5. **Upload assets** to the release

## Monitoring Builds

- Go to your repository → Actions tab
- Click on the running workflow to see progress
- Each platform builds in parallel
- Build artifacts are uploaded to the release automatically

## Troubleshooting

### Build Fails on macOS
- Check if `CSC_LINK` and `CSC_KEY_PASSWORD` are set correctly
- Ensure your certificate is valid and not expired

### Build Fails on Windows
- Verify Node.js version compatibility
- Check if all dependencies are properly installed

### Release Not Created
- Ensure the tag starts with `v` (e.g., `v1.0.0`)
- Check that `GITHUB_TOKEN` has proper permissions
- Verify the repository URL in `package.json` is correct

## Manual Testing

Before releasing, test locally:

\`\`\`bash
# Install dependencies
npm install

# Test the app
npm start

# Build for your platform
npm run build

# Test the built app
open "dist/iAI Chat Interface.app"  # macOS
\`\`\`

## Distribution

After a successful release:

1. **Download links** are available on the GitHub releases page
2. **Direct installation**: Users can download and install directly
3. **Auto-updates**: Can be implemented using `electron-updater`
4. **App stores**: Built artifacts can be submitted to app stores

## Security Notes

- Never commit certificates or passwords to the repository
- Use GitHub Secrets for all sensitive information
- Regularly rotate signing certificates
- Monitor build logs for any exposed secrets
\`\`\`

Create a simple workflow for testing builds without releasing:
