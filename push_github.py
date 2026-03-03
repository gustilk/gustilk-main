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

# Files to push (relative to workspace root)
FILES = [
    "server/routes.ts",
    "server/seed.ts",
    "server/storage.ts",
    "shared/schema.ts",
    "client/src/App.tsx",
    "client/src/components/BottomNav.tsx",
    "client/src/pages/AdminPage.tsx",
    "client/src/pages/ProfilePage.tsx",
    "client/src/pages/EditProfilePage.tsx",
    "client/src/pages/ChatPage.tsx",
    "client/src/pages/EventsPage.tsx",
    "client/src/pages/ViewUserProfilePage.tsx",
]

def read_b64(path):
    with open(f"/home/runner/workspace/{path}", "rb") as f:
        return base64.b64encode(f.read()).decode()

# Get current branch HEAD
ref = gh("GET", f"/repos/{REPO}/git/ref/heads/main")
base_sha = ref["object"]["sha"]
print(f"Base commit: {base_sha}")

# Get base tree SHA
commit = gh("GET", f"/repos/{REPO}/git/commits/{base_sha}")
base_tree = commit["tree"]["sha"]

# Build tree entries
tree_entries = []
for f in FILES:
    if not os.path.exists(f"/home/runner/workspace/{f}"):
        print(f"  Skipping (not found): {f}")
        continue
    content = read_b64(f)
    blob = gh("POST", f"/repos/{REPO}/git/blobs", {"content": content, "encoding": "base64"})
    tree_entries.append({"path": f, "mode": "100644", "type": "blob", "sha": blob["sha"]})
    print(f"  Staged: {f}")

# Create new tree
new_tree = gh("POST", f"/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": tree_entries})

# Create commit
new_commit = gh("POST", f"/repos/{REPO}/git/commits", {
    "message": "Sync: admin panel overhaul, Kurdish support, nav restrictions, photo fix, contact support",
    "tree": new_tree["sha"],
    "parents": [base_sha],
})

# Update branch ref
gh("PATCH", f"/repos/{REPO}/git/refs/heads/main", {"sha": new_commit["sha"]})
print(f"\n✅ Pushed to gustilk/gustilk-main — commit {new_commit['sha'][:7]}")
