#!/bin/bash
# Deploy Potree to local Apache server
# Target: /media/nicholas/DATA2/html/viewer

set -e

SOURCE_DIR="/media/nicholas/PROJECTS/potree-bun"
TARGET_DIR="/media/nicholas/DATA2/html/viewer"

echo "Building production bundle..."
cd "$SOURCE_DIR"
bun run build:prod

echo "Deploying to $TARGET_DIR..."

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Copy required files
echo "Copying index.html..."
cp "$SOURCE_DIR/index.html" "$TARGET_DIR/"

echo "Copying build directory..."
rsync -av --delete "$SOURCE_DIR/build/" "$TARGET_DIR/build/"

echo "Copying libs directory..."
rsync -av --delete "$SOURCE_DIR/libs/" "$TARGET_DIR/libs/"

echo "Copying resources directory..."
rsync -av --delete "$SOURCE_DIR/resources/" "$TARGET_DIR/resources/"

echo "Copying branding assets..."
cp "$SOURCE_DIR/height_legend_feet.png" "$TARGET_DIR/"
cp "$SOURCE_DIR/mappalachian.png" "$TARGET_DIR/"

echo ""
echo "Deployment complete!"
echo "Access at: https://ubuntu-dev/viewer/"
