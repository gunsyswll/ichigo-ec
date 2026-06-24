"""Fix preview nav 404s: create the Shopify Pages the nav links to (about/farmers/
help/shop) with the right template_suffix, and re-upload the repointed sections to
the EXISTING unpublished theme (no new theme). Token via client_credentials."""
import os, json, base64, time, subprocess
from pathlib import Path
THEME=186906968344
env={}
for line in open(os.path.expanduser("~/.ichigo-shopify.env")):
    line=line.strip()
    if "=" in line and not line.startswith("#"):
        k,v=line.split("=",1); env[k.strip()]=v.strip()
STORE=env["SHOPIFY_STORE"].strip().rstrip("/").replace("https://","").replace("http://","")
CID=env["SHOPIFY_CLIENTID"].strip(); SEC=env["SHOPIFY_SECRET"].strip()
API=f"https://{STORE}/admin/api/2024-10"
def get_token():
    r=subprocess.run(["curl","-sS","-m","30","-X","POST",f"https://{STORE}/admin/oauth/access_token",
        "-H","Content-Type: application/json",
        "-d",json.dumps({"client_id":CID,"client_secret":SEC,"grant_type":"client_credentials"})],
        capture_output=True,text=True)
    return json.loads(r.stdout)["access_token"]
TOKEN=get_token()
def req(method,url,body=None):
    cmd=["curl","-sS","-X",method,url,"-H",f"X-Shopify-Access-Token: {TOKEN}",
         "-H","Content-Type: application/json","-m","120","-o","/tmp/_fr.json","-w","%{http_code}"]
    if body is not None:
        open("/tmp/_fp.json","w").write(json.dumps(body)); cmd+=["--data-binary","@/tmp/_fp.json"]
    code=subprocess.run(cmd,capture_output=True,text=True).stdout.strip()
    try: data=json.load(open("/tmp/_fr.json"))
    except Exception: data={}
    return int(code or 0), data

# 1) create the Pages the nav needs (idempotent), with template suffixes
PAGES=[("About Us","about","about"),("Our Farmers","farmers","farmers"),
       ("Help & Info","help","help"),("Shop & Reserve","shop","shop")]
st,ex=req("GET",f"{API}/pages.json?limit=250"); have={p["handle"]:p for p in ex.get("pages",[])}
for title,handle,suffix in PAGES:
    if handle in have:
        pid=have[handle]["id"]
        st,r=req("PUT",f"{API}/pages/{pid}.json",{"page":{"id":pid,"template_suffix":suffix}})
        print(f"page /{handle} exists → ensured suffix={suffix} [{st}]")
    else:
        st,r=req("POST",f"{API}/pages.json",{"page":{"title":title,"handle":handle,"template_suffix":suffix,"body_html":"","published":True}})
        print(f"page /{handle} created id={r.get('page',{}).get('id')} suffix={r.get('page',{}).get('template_suffix')} [{st}]")

# 2) re-upload all theme files to the EXISTING theme (lands the repointed sections)
root=Path.home()/"ichigo-ec/shopify-theme"
VALID={"assets","config","layout","locales","sections","snippets","templates","blocks"}
BIN={".jpg",".jpeg",".png",".webp",".gif",".ico",".woff",".woff2",".ttf",".otf"}
files=[p for p in root.rglob("*") if p.is_file() and ".git" not in p.parts and p.relative_to(root).parts[0] in VALID]
ok=bad=0
for p in sorted(files):
    key=str(p.relative_to(root))
    asset={"key":key,"attachment":base64.b64encode(p.read_bytes()).decode()} if p.suffix.lower() in BIN else {"key":key,"value":p.read_text(encoding="utf-8")}
    st,r=req("PUT",f"{API}/themes/{THEME}/assets.json",{"asset":asset})
    ok+=1 if st in (200,201) else 0; bad+=0 if st in (200,201) else 1
    if st not in (200,201): print(f"  FAIL {key} [{st}] {str(r)[:100]}")
    time.sleep(0.5)
print(f"\nre-uploaded {ok} ok, {bad} bad to theme {THEME}")
print(f"PREVIEW: https://{STORE}/?preview_theme_id={THEME}")
print("FIX_DONE")
