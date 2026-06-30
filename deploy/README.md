# Deploying AnyField to Google Cloud Run (serverless)

Cloud Run runs the app's Docker container, scales to zero when idle, and gives
you a public **HTTPS** URL (so WebGPU works on iPhone). Two ways:

## A. One command in Google Cloud Shell (easiest, phone-friendly)

Cloud Shell is a browser terminal already logged into your Google account — no
keys, no local install.

1. Open **https://shell.cloud.google.com**
2. (If you don't have a project yet, create one at
   https://console.cloud.google.com/projectcreate — note its **Project ID**.)
3. Paste:

   ```bash
   git clone -b claude/webgpu-glass-social-space-jcfei6 https://github.com/triadastra/AnyField.git
   cd AnyField
   PROJECT_ID=your-project-id bash deploy/cloudrun.sh
   ```

The script enables the APIs, builds the container from `app/` via Cloud Build,
deploys to Cloud Run, and prints the live URL (looks like
`https://anyfield-XXXXXXXX-uc.a.run.app`).

> First-time note: Cloud Run/Cloud Build require **billing enabled** on the
> project (there's a generous always-free tier; an idle service costs ~$0).

## B. Auto-deploy from GitHub (optional, ongoing)

`.github/workflows/deploy-cloudrun.yml` deploys on push once you wire up creds.
One-time GCP setup (run in Cloud Shell), then add two repo secrets:

```bash
PROJECT_ID=your-project-id
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com iam.googleapis.com

# a service account for CI
gcloud iam service-accounts create anyfield-ci --display-name="AnyField CI"
SA="anyfield-ci@${PROJECT_ID}.iam.gserviceaccount.com"
for role in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.admin roles/iam.serviceAccountUser roles/storage.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role="$role"
done

# a key to hand to GitHub
gcloud iam service-accounts keys create key.json --iam-account="$SA"
cat key.json   # copy the whole JSON
```

Then in the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

- `GCP_SA_KEY` = the full contents of `key.json`
- `GCP_PROJECT` = your project id

Finally, in `deploy-cloudrun.yml` change `if: ${{ false }}` to `if: ${{ true }}`
and push (or run the workflow manually). Delete `key.json` afterwards.

> Prefer no long-lived keys? Use Workload Identity Federation with
> `google-github-actions/auth` (`workload_identity_provider` + `service_account`)
> instead of `GCP_SA_KEY`.

## Container note

The image serves the static bundle via nginx on port **80**; the deploy sets
Cloud Run's container port to 80 (`--port 80`). No app changes needed.
