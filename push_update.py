"""Push changed theme files to the LIVE Ichigo-preview theme (id 186906968344) in place.
Companion to push_shopify.py (which creates a NEW unpublished theme) — use this one for
iterating on the existing theme. Never prints the token.

Usage:  python3 push_update.py sections/index-hero.liquid [more keys...]
        python3 push_update.py --since <git-ref>   # every shopify-theme/ file changed since ref
"""
import os, sys, json, subprocess
from pathlib import Path
THEME = 186906968344
ROOT = Path(__file__).resolve().parent
TDIR = ROOT / "shopify-theme"

if len(sys.argv) > 2 and sys.argv[1] == "--since":
    r = subprocess.run(["git", "-C", str(ROOT), "diff", "--name-only", sys.argv[2], "--", "shopify-theme/"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(f"git diff failed for ref '{sys.argv[2]}':\n{r.stderr.strip()}"); raise SystemExit(1)
    keys = [p.split("shopify-theme/", 1)[1] for p in r.stdout.split()]
else:
    keys = sys.argv[1:]
if not keys:
    print("nothing to push"); raise SystemExit(0)

env = dict(l.strip().split("=", 1) for l in open(os.path.expanduser("~/.ichigo-shopify.env")) if "=" in l and not l.startswith("#"))
S = env["SHOPIFY_STORE"].strip().rstrip("/").replace("https://", "").replace("http://", "")
TOK = json.loads(subprocess.run(["curl", "-sS", "-m", "30", "-X", "POST", f"https://{S}/admin/oauth/access_token",
    "-H", "Content-Type: application/json",
    "-d", json.dumps({"client_id": env["SHOPIFY_CLIENTID"].strip(), "client_secret": env["SHOPIFY_SECRET"].strip(),
                      "grant_type": "client_credentials"})], capture_output=True, text=True).stdout)["access_token"]

fails = []
for key in keys:
    p = TDIR / key
    if not p.is_file():
        print(f"[skip] {key} (not a file)"); continue
    Path("/tmp/_pu.json").write_text(json.dumps({"asset": {"key": key, "value": p.read_text()}}))
    code = subprocess.run(["curl", "-sS", "-g", "-m", "120", "-X", "PUT",
        f"https://{S}/admin/api/2024-10/themes/{THEME}/assets.json",
        "-H", f"X-Shopify-Access-Token: {TOK}", "-H", "Content-Type: application/json",
        "--data-binary", "@/tmp/_pu.json", "-o", "/tmp/_pur.json", "-w", "%{http_code}"],
        capture_output=True, text=True).stdout.strip()
    print(f"[{code}] {key}")
    if code != "200":
        fails.append(key); print("   ", open("/tmp/_pur.json").read()[:300])
print("ALL PUSHED OK" if not fails else f"FAILED: {fails}")
