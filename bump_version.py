"""Versioning for the Ichigo-preview theme (id 186906968344). Bumps semver, syncs
it into config/settings_schema.json theme_info.theme_version, renames the Shopify
theme to 'Ichigo-preview · vX.Y.Z', git-commits + tags. NEVER touches the Rise theme.

Usage:  python3 bump_version.py            # apply current VERSION (no bump)
        python3 bump_version.py patch       # 1.0.0 -> 1.0.1
        python3 bump_version.py minor        # 1.0.0 -> 1.1.0
        python3 bump_version.py major        # 1.0.0 -> 2.0.0
"""
import os, sys, json, subprocess
from pathlib import Path
THEME=186906968344
ROOT=Path.home()/"ichigo-ec"; TDIR=ROOT/"shopify-theme"; VF=TDIR/"VERSION"; SS=TDIR/"config/settings_schema.json"
ver=(VF.read_text().strip() if VF.exists() else "1.0.0")
maj,minr,pat=(int(x) for x in ver.split("."))
lvl=sys.argv[1] if len(sys.argv)>1 else None
if lvl=="major": maj,minr,pat=maj+1,0,0
elif lvl=="minor": minr,pat=minr+1,0
elif lvl=="patch": pat+=1
ver=f"{maj}.{minr}.{pat}"; VF.write_text(ver+"\n")
# sync into settings_schema theme_info
data=json.load(open(SS))
for blk in (data if isinstance(data,list) else [data]):
    if isinstance(blk,dict) and blk.get("name")=="theme_info": blk["theme_version"]=ver
json.dump(data,open(SS,"w"),indent=2,ensure_ascii=False); SS.write_text(SS.read_text()+"\n")
print(f"version -> {ver}")
# token
env=dict(l.strip().split("=",1) for l in open(os.path.expanduser("~/.ichigo-shopify.env")) if "=" in l and not l.startswith("#"))
S=env["SHOPIFY_STORE"].strip().rstrip("/").replace("https://","").replace("http://","")
CID=env["SHOPIFY_CLIENTID"].strip(); SEC=env["SHOPIFY_SECRET"].strip()
TOK=json.loads(subprocess.run(["curl","-sS","-m","30","-X","POST",f"https://{S}/admin/oauth/access_token","-H","Content-Type: application/json","-d",json.dumps({"client_id":CID,"client_secret":SEC,"grant_type":"client_credentials"})],capture_output=True,text=True).stdout)["access_token"]
def req(method,url,body):
    open("/tmp/_bv.json","w").write(json.dumps(body))
    code=subprocess.run(["curl","-sS","-X",method,url,"-H",f"X-Shopify-Access-Token: {TOK}","-H","Content-Type: application/json","-m","60","-o","/tmp/_bvr.json","-w","%{http_code}","--data-binary","@/tmp/_bv.json"],capture_output=True,text=True).stdout.strip()
    try: return int(code), json.load(open("/tmp/_bvr.json"))
    except Exception: return int(code or 0), {}
# rename theme (Rise is a different id — never touched)
st,r=req("PUT",f"https://{S}/admin/api/2024-10/themes/{THEME}.json",{"theme":{"id":THEME,"name":f"Ichigo-preview · v{ver}"}})
print(f"theme renamed: [{st}] {r.get('theme',{}).get('name')}")
# push the updated settings_schema asset so theme_version is live
st,r=req("PUT",f"https://{S}/admin/api/2024-10/themes/{THEME}/assets.json",{"asset":{"key":"config/settings_schema.json","value":SS.read_text()}})
print(f"settings_schema pushed: [{st}]")
# git commit + tag
os.chdir(ROOT)
subprocess.run(["git","add","shopify-theme/VERSION","shopify-theme/CHANGELOG.md","shopify-theme/config/settings_schema.json"])
subprocess.run(["git","-c","user.name=LAU WAI LEUNG","-c","user.email=lau.wai-leung@j-doc.jp","commit","-q","-m",f"release: ichigo-preview v{ver}\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"])
subprocess.run(["git","tag","-f",f"v{ver}"])
print(f"git committed + tagged v{ver}")
print("BUMP_DONE")
