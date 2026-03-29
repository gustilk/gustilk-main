import os, base64, json, time
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

def gh_blob_with_retry(f, content, max_retries=5):
    for attempt in range(max_retries):
        try:
            return gh("POST", f"/repos/{REPO}/git/blobs", {"content": content, "encoding": "base64"})
        except HTTPError as e:
            if e.status == 403 and attempt < max_retries - 1:
                wait = 60 * (attempt + 1)
                print(f"  ⏳ Rate limited on {f}, waiting {wait}s before retry {attempt+2}/{max_retries}...")
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
    "client/public/gustilk-logo.svg",
    "client/public/logo-fixed.png",
    "client/public/logo-fixed2.png",
    "client/public/logo-transparent.png",
    "client/public/logo.jpeg",
    "client/public/logo.jpg",
    "client/public/logo.png",
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

def read_b64(path):
    with open(os.path.join(WORKSPACE, path), "rb") as f:
        return base64.b64encode(f.read()).decode()

# Get current branch HEAD
ref = gh("GET", f"/repos/{REPO}/git/ref/heads/main")
base_sha = ref["object"]["sha"]
print(f"Base commit: {base_sha}")

commit = gh("GET", f"/repos/{REPO}/git/commits/{base_sha}")
base_tree = commit["tree"]["sha"]

all_files = collect_files()
print(f"Staging {len(all_files)} files...")

tree_entries = []
failed = []
for f in all_files:
    if not os.path.exists(os.path.join(WORKSPACE, f)):
        continue
    try:
        content = read_b64(f)
        blob = gh_blob_with_retry(f, content)
        tree_entries.append({"path": f, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        print(f"  + {f}")
    except Exception as e:
        print(f"  ! Failed to stage {f}: {e}")
        failed.append(f)

if failed:
    print(f"\n⚠️  {len(failed)} file(s) failed to stage: {failed}")
    print("Commit will proceed without them — re-run the script to retry.\n")

for f in DELETED_FILES:
    tree_entries.append({"path": f, "mode": "100644", "type": "blob", "sha": None})
    print(f"  - {f} (deleted)")

new_tree = gh("POST", f"/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": tree_entries})

new_commit = gh("POST", f"/repos/{REPO}/git/commits", {
    "message": "chore: sync latest changes",
    "tree": new_tree["sha"],
    "parents": [base_sha],
})

gh("PATCH", f"/repos/{REPO}/git/refs/heads/main", {"sha": new_commit["sha"]})
print(f"\n✅ Pushed to gustilk/gustilk-main — commit {new_commit['sha'][:7]}")
if failed:
    print(f"⚠️  Missing files (run again to retry): {', '.join(failed)}")
