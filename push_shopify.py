"""Push the converted Liquid theme to Shopify as an UNPUBLISHED theme (safe — no
live-storefront impact) via the Admin Asset API, using the custom-app Admin token.
Never prints the token."""
import os, json, base64, time, subprocess
from pathlib import Path
env={}
for line in open(os.path.expanduser("~/.ichigo-shopify.env")):
    line=line.strip()
    if "=" in line and not line.startswith("#"):
        k,v=line.split("=",1); env[k.strip()]=v.strip()
STORE=env["SHOPIFY_STORE"].strip().rstrip("/").replace("https://","").replace("http://","")
CID=env["SHOPIFY_CLIENTID"].strip(); SEC=env["SHOPIFY_SECRET"].strip()
API=f"https://{STORE}/admin/api/2024-10"

def get_token():
    """Fetch a fresh Admin token via the client_credentials grant (the working path)."""
    r=subprocess.run(["curl","-sS","-m","30","-X","POST",f"https://{STORE}/admin/oauth/access_token",
        "-H","Content-Type: application/json",
        "-d",json.dumps({"client_id":CID,"client_secret":SEC,"grant_type":"client_credentials"})],
        capture_output=True,text=True)
    tok=json.loads(r.stdout)["access_token"]
    # persist into ~/.ichigo-shopify.env (update SHOPIFY_ADMIN_TOKEN line)
    p=os.path.expanduser("~/.ichigo-shopify.env"); lines=open(p).read().splitlines(); out=[]; done=False
    for ln in lines:
        if ln.strip().startswith("SHOPIFY_ADMIN_TOKEN="): out.append(f"SHOPIFY_ADMIN_TOKEN={tok}"); done=True
        else: out.append(ln)
    if not done: out.append(f"SHOPIFY_ADMIN_TOKEN={tok}")
    open(p,"w").write("\n".join(out)+"\n")
    return tok
TOKEN=get_token()
print(f"fresh token acquired (prefix {TOKEN[:6]}…) + saved to env")
def req(method,url,body=None):
    cmd=["curl","-sS","-X",method,url,"-H",f"X-Shopify-Access-Token: {TOKEN}",
         "-H","Content-Type: application/json","-m","120","-o","/tmp/_sresp.json","-w","%{http_code}"]
    if body is not None:
        open("/tmp/_spl.json","w").write(json.dumps(body)); cmd+=["--data-binary","@/tmp/_spl.json"]
    code=subprocess.run(cmd,capture_output=True,text=True).stdout.strip()
    try: data=json.load(open("/tmp/_sresp.json"))
    except Exception: data={}
    return int(code or 0), data

# 1) validate auth (read-only)
st,shop=req("GET",f"{API}/shop.json")
if st!=200: print(f"AUTH FAIL {st}: {str(shop)[:200]}"); raise SystemExit(1)
print(f"auth OK · shop: {shop['shop']['name']} ({shop['shop']['myshopify_domain']}) plan={shop['shop'].get('plan_name')}")

# 2) create unpublished theme
st,resp=req("POST",f"{API}/themes.json",{"theme":{"name":"Ichigo — Claude conversion","role":"unpublished"}})
if st not in (200,201): print(f"CREATE THEME FAIL {st}: {str(resp)[:300]}"); raise SystemExit(1)
tid=resp["theme"]["id"]; print(f"created unpublished theme id={tid}")

# 3) upload valid theme files only
root=Path.home()/"ichigo-ec/shopify-theme"
VALID={"assets","config","layout","locales","sections","snippets","templates","blocks"}
BIN={".jpg",".jpeg",".png",".webp",".gif",".ico",".woff",".woff2",".ttf",".otf"}
files=[p for p in root.rglob("*") if p.is_file() and ".git" not in p.parts and p.relative_to(root).parts[0] in VALID]
ok=bad=0; fails=[]
for p in sorted(files):
    key=str(p.relative_to(root))
    if p.suffix.lower() in BIN:
        asset={"key":key,"attachment":base64.b64encode(p.read_bytes()).decode()}
    else:
        asset={"key":key,"value":p.read_text(encoding="utf-8")}
    st,resp=req("PUT",f"{API}/themes/{tid}/assets.json",{"asset":asset})
    if st in (200,201): ok+=1
    else: bad+=1; fails.append((key,st,str(resp)[:150]))
    time.sleep(0.6)
print(f"\nuploaded {ok} ok, {bad} failed (of {len(files)})")
for k,s,m in fails: print(f"  FAIL {k} [{s}] {m}")
print(f"\nPREVIEW: https://{STORE}/?preview_theme_id={tid}")
print(f"EDITOR:  https://{STORE}/admin/themes/{tid}/editor")
print("PUSH_DONE")
