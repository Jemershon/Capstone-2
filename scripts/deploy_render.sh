#!/usr/bin/env bash
set -euo pipefail

RENDER_API_KEY=${RENDER_API_KEY:-}
SERVICE_NAME=${1:-capstone-backend}
BRANCH=${2:-main}

if [ -z "$RENDER_API_KEY" ]; then
  echo "Please set RENDER_API_KEY environment variable"
  exit 1
fi

SERVICES_JSON=$(curl -sS -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/services)
SERVICE_ID=$(echo "$SERVICES_JSON" | jq -r ".[] | select(.name==\"$SERVICE_NAME\") | .id")
if [ -z "$SERVICE_ID" ]; then
  echo "Service $SERVICE_NAME not found"
  exit 1
fi

DEPLOY=$(curl -sS -X POST -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  -d "{\"serviceId\": \"$SERVICE_ID\", \"branch\": \"$BRANCH\"}" \
  https://api.render.com/v1/services/$SERVICE_ID/deploys)

echo "Triggered deploy: $(echo $DEPLOY | jq -r .id)"
