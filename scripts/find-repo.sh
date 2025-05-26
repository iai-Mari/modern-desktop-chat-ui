#!/bin/bash

# Script to help locate or create GitHub repository
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Checking current Git configuration..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a Git repository. Initializing..."
    git init
    print_success "Git repository initialized"
fi

# Check current remote
if git remote get-url origin > /dev/null 2>&1; then
    CURRENT_REMOTE=$(git remote get-url origin)
    print_status "Current remote URL: $CURRENT_REMOTE"
    
    # Extract GitHub username and repo name
    if [[ $CURRENT_REMOTE =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
        GITHUB_USER="${BASH_REMATCH[1]}"
        REPO_NAME="${BASH_REMATCH[2]}"
        print_success "Detected GitHub repository: $GITHUB_USER/$REPO_NAME"
        
        # Test if repository is accessible
        print_status "Testing repository access..."
        if git ls-remote origin > /dev/null 2>&1; then
            print_success "Repository is accessible!"
            echo ""
            echo "🎉 Your repository URLs:"
            echo "📁 Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
            echo "⚡ Actions: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
            echo "📦 Releases: https://github.com/$GITHUB_USER/$REPO_NAME/releases"
            echo ""
        else
            print_error "Repository exists but is not accessible. It might be private or you don't have permissions."
            echo ""
            echo "🔧 To fix this:"
            echo "1. Go to https://github.com/$GITHUB_USER/$REPO_NAME"
            echo "2. Make sure the repository exists and is public"
            echo "3. Or check your GitHub authentication"
        fi
    else
        print_warning "Remote URL doesn't appear to be a GitHub repository"
        echo "Current remote: $CURRENT_REMOTE"
    fi
else
    print_warning "No remote repository configured"
    echo ""
    echo "🔧 You need to create a GitHub repository. Here's how:"
    echo ""
    echo "1. Go to https://github.com/new"
    echo "2. Create a repository named 'modern-desktop-chat-ui' (or any name you prefer)"
    echo "3. Don't initialize with README (we already have files)"
    echo "4. Copy the repository URL and run:"
    echo ""
    echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
fi

# Check GitHub CLI
if command -v gh &> /dev/null; then
    print_status "GitHub CLI detected. You can also create a repository with:"
    echo "   gh repo create modern-desktop-chat-ui --public --source=. --remote=origin --push"
else
    print_status "Install GitHub CLI for easier repository management:"
    echo "   https://cli.github.com/"
fi
