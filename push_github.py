import os, base64, json, time, hashlib
from urllib.request import Request, urlopen
from urllib.error import HTTPError

TOKEN = os.environ["GITHUB_TOKEN"]
REPO  = "gustilk/gustilk-main"
BASE  = "https://api.github.com"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
}

def gh(method, path, body=None):
    req = Request(f"{BASE}{path}", method=method, headers=HEADERS,
                  data=json.dumps(body).encode() if body else None)
    try:
        with urlopen(req) as r:
            return json.loads(r.read())
    except HTTPError as e:
        print("Error:", e.status, e.read().decode())
        raise

def gh_with_retry(method, path, body=None, label="", max_retries=5):
    for attempt in range(max_retries):
        try:
            return gh(method, path, body)
        except HTTPError as e:
            if e.status == 403 and attempt < max_retries - 1:
                wait = 60 * (attempt + 1)
                print(f"  ⏳ Rate limited on {label}, waiting {wait}s (retry {attempt+2}/{max_retries})...")
                time.sleep(wait)
            else:
                raise

WORKSPACE = "/home/runner/workspace"

INCLUDE_DIRS = [
    "server",
    "shared",
    "client/src",
    "script",
    "client/public/lottie",
]

ROOT_FILES = [
    "package.json",
    "package-lock.json",
    "Dockerfile",
    "vite.config.ts",
    "tailwind.config.ts",
    "tsconfig.json",
    "drizzle.config.ts",
    "components.json",
    "nixpacks.toml",
    "client/index.html",
    "client/public/gustilk-logo.png",
    "client/public/favicon.png",
    "client/public/logo-192.png",
    "client/public/manifest.json",
]

DELETED_FILES = [
]

INCLUDE_EXTS = {".ts", ".tsx", ".js", ".json", ".css", ".html", ".md", ".png", ".jpg", ".jpeg", ".svg"}

SKIP_PREFIXES = [
    "node_modules",
    ".git",
    "dist",
    ".local",
    "attached_assets",
]

SKIP_EXACT = {
    "push_github.py",
}

def should_include(rel_path):
    if rel_path in SKIP_EXACT:
        return False
    for prefix in SKIP_PREFIXES:
        if rel_path.startswith(prefix):
            return False
    _, ext = os.path.splitext(rel_path)
    return ext in INCLUDE_EXTS

def collect_files():
    files = set()
    for f in ROOT_FILES:
        abs_path = os.path.join(WORKSPACE, f)
        if os.path.exists(abs_path):
            files.add(f)
    for d in INCLUDE_DIRS:
        abs_dir = os.path.join(WORKSPACE, d)
        if not os.path.isdir(abs_dir):
            continue
        for root, dirs, filenames in os.walk(abs_dir):
            dirs[:] = [x for x in dirs if not x.startswith(".")]
            for fn in filenames:
                abs_path = os.path.join(root, fn)
                rel_path = os.path.relpath(abs_path, WORKSPACE)
                if should_include(rel_path):
                    files.add(rel_path)
    return sorted(files)

def git_blob_sha(path):
    """Compute the Git blob SHA1 for a file (same as GitHub stores)."""
    with open(os.path.join(WORKSPACE, path), "rb") as f:
        data = f.read()
    header = f"blob {len(data)}\0".encode()
    return hashlib.sha1(header + data).hexdigest()

def read_b64(path):
    with open(os.path.join(WORKSPACE, path), "rb") as f:
        return base64.b64encode(f.read()).decode()

# ── Get current HEAD ──────────────────────────────────────────────────────────
ref = gh("GET", f"/repos/{REPO}/git/ref/heads/main")
base_sha = ref["object"]["sha"]
print(f"Base commit: {base_sha}")

commit = gh("GET", f"/repos/{REPO}/git/commits/{base_sha}")
base_tree_sha = commit["tree"]["sha"]

# ── Fetch full tree from GitHub (to compare SHAs) ────────────────────────────
print("Fetching current GitHub tree...")
tree_resp = gh("GET", f"/repos/{REPO}/git/trees/{base_tree_sha}?recursive=1")
github_shas = {item["path"]: item["sha"] for item in tree_resp.get("tree", []) if item["type"] == "blob"}

# ── Collect local files and detect changes ───────────────────────────────────
all_files = collect_files()
changed = []
unchanged = []

for f in all_files:
    if not os.path.exists(os.path.join(WORKSPACE, f)):
        continue
    local_sha = git_blob_sha(f)
    if github_shas.get(f) != local_sha:
        changed.append(f)
    else:
        unchanged.append(f)

print(f"\n{len(changed)} changed, {len(unchanged)} unchanged, {len(DELETED_FILES)} deleted")

if not changed and not DELETED_FILES:
    print("✅ Nothing to push — GitHub is already up to date.")
    exit(0)

print("\nChanged files:")
for f in changed:
    print(f"  + {f}")

# ── Upload blobs only for changed files ──────────────────────────────────────
tree_entries = []
failed = []

for f in changed:
    try:
        content = read_b64(f)
        blob = gh_with_retry("POST", f"/repos/{REPO}/git/blobs",
                              {"content": content, "encoding": "base64"}, label=f)
        tree_entries.append({"path": f, "mode": "100644", "type": "blob", "sha": blob["sha"]})
    except Exception as e:
        print(f"  ! Failed to stage {f}: {e}")
        failed.append(f)

for f in DELETED_FILES:
    tree_entries.append({"path": f, "mode": "100644", "type": "blob", "sha": None})
    print(f"  - {f} (deleted)")

if failed:
    print(f"\n⚠️  {len(failed)} file(s) failed to stage: {failed}")

if not tree_entries:
    print("Nothing staged — aborting.")
    exit(1)

# ── Create tree, commit, update ref ──────────────────────────────────────────
new_tree = gh("POST", f"/repos/{REPO}/git/trees", {"base_tree": base_tree_sha, "tree": tree_entries})

new_commit = gh("POST", f"/repos/{REPO}/git/commits", {
    "message": "chore: sync latest changes",
    "tree": new_tree["sha"],
    "parents": [base_sha],
})

gh("PATCH", f"/repos/{REPO}/git/refs/heads/main", {"sha": new_commit["sha"]})
print(f"\n✅ Pushed to gustilk/gustilk-main — commit {new_commit['sha'][:7]}")
if failed:
    print(f"⚠️  Missing files (run again to retry): {', '.join(failed)}")
