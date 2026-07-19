"""Push changed theme files to the LIVE Ichigo-preview theme (id 186906968344) in place.
Companion to push_shopify.py (which creates a NEW unpublished theme) — use this one for
iterating on the existing theme. Never prints the token.

Usage:  python3 push_update.py sections/index-hero.liquid [more keys...]
        python3 push_update.py --since <git-ref>   # every shopify-theme/ file changed since ref
        python3 push_update.py --all               # full-tree redeploy of every theme file
                                                     # (EXCLUDES config/settings_data.json — see below)
"""
import os, sys, json, base64, subprocess
from pathlib import Path
THEME = 186906968344
ROOT = Path(__file__).resolve().parent
TDIR = ROOT / "shopify-theme"
VALID = {"assets", "config", "layout", "locales", "sections", "snippets", "templates", "blocks"}

if len(sys.argv) > 2 and sys.argv[1] == "--since":
    r = subprocess.run(["git", "-C", str(ROOT), "diff", "--name-only", sys.argv[2], "--", "shopify-theme/"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(f"git diff failed for ref '{sys.argv[2]}':\n{r.stderr.strip()}"); raise SystemExit(1)
    keys = [k for k in (p.split("shopify-theme/", 1)[1] for p in r.stdout.split())
            if k.split("/", 1)[0] in VALID]
elif len(sys.argv) == 2 and sys.argv[1] == "--all":
    # Full-tree redeploy: every file under the theme dirs, pushed as-is.
    # EXCLUDED ON PURPOSE: config/settings_data.json. It holds live theme-editor state —
    # colors, section settings, block content the client has configured in-admin via
    # Online Store > Customize — and overwriting it from the repo would clobber those
    # saved settings. This exact mistake bit the project on 2026-07-18. If you genuinely
    # need to push settings_data.json, pass it explicitly by filename instead.
    EXCLUDE = {"config/settings_data.json"}
    keys = sorted(
        str(p.relative_to(TDIR)) for d in VALID for p in (TDIR / d).rglob("*") if p.is_file()
    )
    keys = [k for k in keys if k not in EXCLUDE]
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

# Shopify's Asset API takes text assets as "value" and binary ones (images, fonts) as
# base64 "attachment". assets/ holds real JPEGs, so --all hits binary on its first key.
TEXT_SUFFIXES = {".liquid", ".json", ".js", ".css", ".scss", ".svg", ".md", ".txt", ".map"}

fails = []
for key in keys:
    p = TDIR / key
    if not p.is_file():
        print(f"[skip] {key} (not a file)"); continue
    if p.suffix.lower() in TEXT_SUFFIXES:
        asset = {"key": key, "value": p.read_text()}
    else:
        asset = {"key": key, "attachment": base64.b64encode(p.read_bytes()).decode()}
    Path("/tmp/_pu.json").write_text(json.dumps({"asset": asset}))
    code = subprocess.run(["curl", "-sS", "-g", "-m", "120", "-X", "PUT",
        f"https://{S}/admin/api/2024-10/themes/{THEME}/assets.json",
        "-H", f"X-Shopify-Access-Token: {TOK}", "-H", "Content-Type: application/json",
        "--data-binary", "@/tmp/_pu.json", "-o", "/tmp/_pur.json", "-w", "%{http_code}"],
        capture_output=True, text=True).stdout.strip()
    print(f"[{code}] {key}")
    if code != "200":
        fails.append(key); print("   ", open("/tmp/_pur.json").read()[:300])
print("ALL PUSHED OK" if not fails else f"FAILED: {fails}")
