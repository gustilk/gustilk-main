import os, base64, json
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

WORKSPACE = "/home/runner/workspace"

# Directories and individual files to include
INCLUDE_DIRS = [
    "server",
    "shared",
    "client/src",
    "script",
]

# Extensions to include
INCLUDE_EXTS = {".ts", ".tsx", ".js", ".json", ".css", ".html", ".md"}

# Paths to skip entirely
SKIP_PREFIXES = [
    "client/src/i18n/locales",  # large locale files unchanged
    "node_modules",
    ".git",
    "dist",
    ".local",
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
    files = []
    for d in INCLUDE_DIRS:
        abs_dir = os.path.join(WORKSPACE, d)
        if not os.path.isdir(abs_dir):
            continue
        for root, dirs, filenames in os.walk(abs_dir):
            # Skip hidden dirs
            dirs[:] = [x for x in dirs if not x.startswith(".")]
            for fn in filenames:
                abs_path = os.path.join(root, fn)
                rel_path = os.path.relpath(abs_path, WORKSPACE)
                if should_include(rel_path):
                    files.append(rel_path)
    return sorted(files)

def read_b64(path):
    with open(os.path.join(WORKSPACE, path), "rb") as f:
        return base64.b64encode(f.read()).decode()

# Get current branch HEAD
ref = gh("GET", f"/repos/{REPO}/git/ref/heads/main")
base_sha = ref["object"]["sha"]
print(f"Base commit: {base_sha}")

# Get base tree SHA
commit = gh("GET", f"/repos/{REPO}/git/commits/{base_sha}")
base_tree = commit["tree"]["sha"]

# Collect all files
all_files = collect_files()
print(f"Staging {len(all_files)} files...")

# Build tree entries
tree_entries = []
for f in all_files:
    if not os.path.exists(os.path.join(WORKSPACE, f)):
        continue
    try:
        content = read_b64(f)
        blob = gh("POST", f"/repos/{REPO}/git/blobs", {"content": content, "encoding": "base64"})
        tree_entries.append({"path": f, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        print(f"  + {f}")
    except Exception as e:
        print(f"  ! Failed to stage {f}: {e}")

# Create new tree
new_tree = gh("POST", f"/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": tree_entries})

# Create commit
new_commit = gh("POST", f"/repos/{REPO}/git/commits", {
    "message": "Sync: full admin panel (28 sub-pages), analytics fix, all new files",
    "tree": new_tree["sha"],
    "parents": [base_sha],
})

# Update branch ref
gh("PATCH", f"/repos/{REPO}/git/refs/heads/main", {"sha": new_commit["sha"]})
print(f"\n✅ Pushed to gustilk/gustilk-main — commit {new_commit['sha'][:7]}")
