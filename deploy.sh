#!/bin/bash

# Remora System Deployment Script
# Usage: ./deploy.sh [commit-message]

echo "================================"
echo "  🚀 REMORA SYSTEM DEPLOYMENT"
echo "================================"
echo

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    echo "Please run this from the project root directory"
    exit 1
fi

# Get commit message from user or use default
COMMIT_MSG="${1:-Update system deployment}"
echo "📝 Commit message: $COMMIT_MSG"
echo

# Add all changes
echo "📦 Adding all changes..."
git add .
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to add changes"
    exit 1
fi

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "ℹ️  No changes to commit"
    echo
    echo "🔍 Checking remote status..."
    git fetch
    git status
    exit 0
fi

# Commit changes
echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to commit changes"
    exit 1
fi

# Push to remote
echo "🌐 Pushing to remote repository..."
git push
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to push to remote"
    echo
    echo "🔧 Trying to set upstream..."
    git push --set-upstream origin main
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to push with upstream"
        exit 1
    fi
fi

echo
echo "✅ Successfully deployed!"
echo "🎉 Your Remora system has been updated"
echo
echo "📋 Summary:"
echo "   - Added all changes"
echo "   - Committed: \"$COMMIT_MSG\""
echo "   - Pushed to remote repository"
echo
echo "🌍 Your deployed system should update automatically"
echo