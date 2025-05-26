#!/bin/bash

# Release script for Modern Desktop Chat UI
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

if [ -z "$1" ]; then
    print_error "Please provide a version number (e.g., v1.0.0)"
    echo "Usage: $0 <version>"
    exit 1
fi

VERSION=$1

if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_error "Version must be in format vX.Y.Z (e.g., v1.0.0)"
    exit 1
fi

print_status "Creating release $VERSION..."

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_error "You have uncommitted changes. Please commit them first."
    exit 1
fi

# Update package.json version
print_status "Updating package.json version..."
npm version ${VERSION#v} --no-git-tag-version

# Commit version bump
git add package.json
git commit -m "chore: bump version to $VERSION"

# Create and push tag
print_status "Creating and pushing tag..."
git tag -a $VERSION -m "Release $VERSION"
git push origin main
git push origin $VERSION

print_success "Release $VERSION created!"
print_status "GitHub Actions will build and publish the release automatically."

# Try to open GitHub Actions page
REPO_URL=$(git config --get remote.origin.url | sed 's/.*github.com[:/]$$[^.]*$$.*/\1/')
echo ""
echo "🔗 Monitor build progress: https://github.com/$REPO_URL/actions"
echo "📦 Releases will be available: https://github.com/$REPO_URL/releases"
