#!/bin/bash
# Deploy Potree to remote Apache server
# Target: mappalachianinfo:/var/www/vhosts/mappalachian.info/httpdocs/viewer

set -e

SOURCE_DIR="/media/nicholas/PROJECTS/potree-bun"
REMOTE_HOST="mappalachianinfo"
REMOTE_DIR="/var/www/vhosts/mappalachian.info/httpdocs/viewer"

echo "Building production bundle..."
cd "$SOURCE_DIR"
bun run build:prod

echo "Deploying to $REMOTE_HOST:$REMOTE_DIR..."

# Create target directory if it doesn't exist
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_DIR"

# Copy required files
echo "Copying index.html..."
scp "$SOURCE_DIR/index.html" "$REMOTE_HOST:$REMOTE_DIR/"

echo "Copying build directory..."
rsync -avz --delete "$SOURCE_DIR/build/" "$REMOTE_HOST:$REMOTE_DIR/build/"

echo "Copying libs directory..."
rsync -avz --delete "$SOURCE_DIR/libs/" "$REMOTE_HOST:$REMOTE_DIR/libs/"

echo "Copying resources directory..."
rsync -avz --delete "$SOURCE_DIR/resources/" "$REMOTE_HOST:$REMOTE_DIR/resources/"

echo "Copying branding assets..."
scp "$SOURCE_DIR/height_legend_feet.png" "$REMOTE_HOST:$REMOTE_DIR/"
scp "$SOURCE_DIR/mappalachian.png" "$REMOTE_HOST:$REMOTE_DIR/"

echo ""
echo "Deployment complete!"
echo "Access at: https://mappalachian.info/viewer/"
