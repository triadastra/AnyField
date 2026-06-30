#!/usr/bin/env bash
# Deploy AnyField to Google Cloud Run (serverless).
#
# Easiest: run this in Google Cloud Shell — https://shell.cloud.google.com —
# which is a browser terminal already logged into your Google account (works on
# a phone). Steps:
#
#   git clone -b claude/webgpu-glass-social-space-jcfei6 https://github.com/triadastra/AnyField.git
#   cd AnyField
#   PROJECT_ID=your-gcp-project-id bash deploy/cloudrun.sh
#
# It enables the needed APIs, builds the Docker image from app/ via Cloud Build,
# deploys it to Cloud Run, and prints the public HTTPS URL.

set -euo pipefail

REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-anyfield}"
BRANCH="${BRANCH:-claude/webgpu-glass-social-space-jcfei6}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"

if [ -z "${PROJECT_ID}" ] || [ "${PROJECT_ID}" = "(unset)" ]; then
  echo "ERROR: no GCP project set."
  echo "  Run:  PROJECT_ID=your-project-id bash deploy/cloudrun.sh"
  echo "  (find/create one at https://console.cloud.google.com/projectcreate)"
  exit 1
fi

echo "==> Project: ${PROJECT_ID}   Region: ${REGION}   Service: ${SERVICE}"
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "==> Enabling APIs (run, cloudbuild, artifactregistry)…"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Find the app/ source. If this script is run standalone (piped), clone first.
SRC="app"
if [ ! -d "${SRC}" ]; then
  echo "==> app/ not found here; cloning ${BRANCH}…"
  rm -rf _anyfield_src
  git clone --depth 1 -b "${BRANCH}" https://github.com/triadastra/AnyField.git _anyfield_src
  SRC="_anyfield_src/app"
fi

echo "==> Deploying to Cloud Run from ${SRC} (this builds the container)…"
gcloud run deploy "${SERVICE}" \
  --source "${SRC}" \
  --region "${REGION}" \
  --port 80 \
  --allow-unauthenticated \
  --quiet

echo
echo "==> Done. Your app is live at:"
gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)'
