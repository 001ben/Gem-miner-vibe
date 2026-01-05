#!/bin/bash
set -e

echo "🔧 Initializing Jules Environment..."

# 1. Install Task (go-task)
if ! command -v task &> /dev/null; then
    echo "Installing Task..."
    # Install to /usr/local/bin so it's in the path
    sudo sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin
else
    echo "Task is already installed."
fi

# 2. Install Python Dependencies (Docs)
echo "Installing Python dependencies..."
python3 -m pip install mkdocs mkdocs-material mdformat mdformat-gfm mdformat-frontmatter mdformat-mkdocs

# 3. Verify Blender (Optional - just check)
if ! command -v blender &> /dev/null; then
    echo "⚠️  Blender not found. 'task build:assets' may fail if it requires local Blender."
    echo "Attempting to install Blender via apt..."
    sudo apt-get update && sudo apt-get install -y blender || echo "❌ Failed to install Blender. Proceeding without it."
else
    echo "Blender is present."
fi

echo "✅ Environment Initialized. Try running 'task --list'"
