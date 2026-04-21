Ship whatever we're currently working on to a Railway preview environment and return the live URL.

## Steps

### 1. Assess current state

Run `git status --short` and `git branch --show-current` to understand where we are.

- If the working tree is clean AND we're already on a PR branch that has been pushed, skip to step 4 (just find the existing Railway URL).
- If there are changes, proceed to step 2.

### 2. Branch

- If we're already on a feature branch (not `main`/`master`), stay on it.
- If we're on `main`/`master`, create a new branch. Derive the name from recent git log or the nature of the changes (e.g. `preview/load-in-date`, `preview/fix-task-dates`). Keep it short and kebab-case.

### 3. Commit & push

- Stage all modified/untracked files: `git add -A` (skip obvious junk: `.env`, `node_modules`, `*.log`)
- If there are staged changes, commit with a clear message describing what's in this preview
- Push: `git push -u origin <branch>`

### 4. Create (or find) the PR

- Use the GitHub MCP tools to check if a PR already exists for this branch against `main` in `brha8286/venyou`
- If no PR exists, create one. Title = what this change does. Body = one-line summary + "Preview deployment requested."
- Note the PR number.

### 5. Wait for the Railway preview URL

Railway automatically builds a preview for every PR and posts it as a GitHub deployment status. Poll for it:

```bash
# Try every 15s, up to 20 attempts (~5 min)
for i in $(seq 1 20); do
  URL=$(curl -sf \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"query":"{ me { projects { edges { node { deployments(first:5) { edges { node { staticUrl meta { branch prNumber } status } } } } } } } }"}' \
    https://backboard.railway.app/graphql/v2 2>/dev/null \
    | grep -o '"staticUrl":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$URL" ]; then
    echo "https://$URL"
    break
  fi
  sleep 15
done
```

If `RAILWAY_TOKEN` is not set, fall back to polling the GitHub Deployments API for the branch:

```bash
for i in $(seq 1 20); do
  DEPLOY_URL=$(curl -sf \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/brha8286/venyou/deployments?ref=<branch>" \
    | python3 -c "import sys,json; deps=json.load(sys.stdin); print(deps[0]['id'] if deps else '')" 2>/dev/null)

  if [ -n "$DEPLOY_URL" ]; then
    # Get the deployment status URL
    STATUS_URL=$(curl -sf \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/brha8286/venyou/deployments/$DEPLOY_URL/statuses" \
      | python3 -c "import sys,json; s=json.load(sys.stdin); print(s[0].get('environment_url','') if s else '')" 2>/dev/null)
    if [ -n "$STATUS_URL" ]; then
      echo "$STATUS_URL"
      break
    fi
  fi
  sleep 15
done
```

If neither token is available, note that and tell the user Railway will build automatically — they can watch it at railway.app.

### 6. Report back

Give the user:
- The branch name
- The PR link (e.g. `brha8286/venyou#42`)
- The Railway preview URL (e.g. `https://venyou-pr42.up.railway.app`)
- If the URL wasn't found yet, tell them Railway is still building and where to watch
