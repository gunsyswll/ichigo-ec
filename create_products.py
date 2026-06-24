"""Create real Ichigo strawberry products in Shopify (active, with images + inventory).
Store currency is JPY. Idempotent by handle. Token via client_credentials."""
import os, json, base64, time, subprocess
from pathlib import Path
env=dict(l.strip().split("=",1) for l in open(os.path.expanduser("~/.ichigo-shopify.env")) if "=" in l and not l.startswith("#"))
S=env["SHOPIFY_STORE"].strip().rstrip("/").replace("https://","").replace("http://","")
CID=env["SHOPIFY_CLIENTID"].strip(); SEC=env["SHOPIFY_SECRET"].strip()
API=f"https://{S}/admin/api/2024-10"
TOKEN=json.loads(subprocess.run(["curl","-sS","-m","30","-X","POST",f"https://{S}/admin/oauth/access_token","-H","Content-Type: application/json","-d",json.dumps({"client_id":CID,"client_secret":SEC,"grant_type":"client_credentials"})],capture_output=True,text=True).stdout)["access_token"]
def req(method,url,body=None):
    cmd=["curl","-sS","-X",method,url,"-H",f"X-Shopify-Access-Token: {TOKEN}","-H","Content-Type: application/json","-m","60","-o","/tmp/_pr.json","-w","%{http_code}"]
    if body is not None: open("/tmp/_pp.json","w").write(json.dumps(body)); cmd+=["--data-binary","@/tmp/_pp.json"]
    code=subprocess.run(cmd,capture_output=True,text=True).stdout.strip()
    try: return int(code or 0), json.load(open("/tmp/_pr.json"))
    except Exception: return int(code or 0), {}
IMG=Path.home()/"ichigo-ec/shopify-theme/assets"
def b64(name):
    p=IMG/name
    return base64.b64encode(p.read_bytes()).decode() if p.exists() else None
# JPY prices (store currency). Design was PHP — flagged separately.
PRODUCTS=[
 dict(handle="standard-strawberry-box", title="Standard Strawberry Box", price=3800, qty=28, img="str-red.jpg",
      tags="Amaou, Single Farm, Box", vendor="Berry Farm (Tanaka)", ptype="Strawberry Box",
      body="<p>12 hand-picked Amaou strawberries from the Tanaka family's Berry Farm in Yame, Fukuoka. Single-farm, single-variety, cold-chain fresh. Net weight ≈ 300g, Brix 12–14°.</p>"),
 dict(handle="premium-gift-box", title="Premium Gift Box", price=6800, qty=15, img="hold-box.jpg",
      tags="Amaou, Gift, Premium", vendor="Berry Farm (Tanaka)", ptype="Gift Box",
      body="<p>A premium presentation box of the season's finest Amaou, wrapped for gifting — wooden box, ribbon, and a handwritten farm note. Cold-chain delivered.</p>"),
 dict(handle="japanese-strawberry-club", title="Japanese Strawberry Club (頒布会)", price=12000, qty=20, img="str-hold.jpg",
      tags="Subscription, Club, Hanpukai", vendor="Ichigo", ptype="Subscription",
      body="<p>Three monthly deliveries, each a different lot and variety at peak season. The 頒布会 club — a little luxury, every month. (Recurring billing via the subscription app.)</p>"),
 dict(handle="farm-b-seasonal-box", title="Farm B — Seasonal Box", price=4200, qty=22, img="str-farm.jpg",
      tags="Seasonal, Single Farm, Box", vendor="Farm B", ptype="Strawberry Box",
      body="<p>A seasonal single-farm box from our second partner farm — whatever is sweetest that week, picked at peak ripeness and flown cold-chain.</p>"),
]
st,ex=req("GET",f"{API}/products.json?limit=250"); have={p["handle"]:p for p in ex.get("products",[])}
created=[]
for pr in PRODUCTS:
    if pr["handle"] in have:
        print(f"exists: {pr['handle']}"); created.append(have[pr["handle"]]); continue
    variant={"price":str(pr["price"]),"inventory_management":"shopify","inventory_quantity":pr["qty"],"requires_shipping":True,"sku":pr["handle"]}
    body={"product":{"title":pr["title"],"handle":pr["handle"],"body_html":pr["body"],"vendor":pr["vendor"],
          "product_type":pr["ptype"],"tags":pr["tags"],"status":"active","variants":[variant]}}
    img=b64(pr["img"])
    if img: body["product"]["images"]=[{"attachment":img}]
    st,r=req("POST",f"{API}/products.json",body)
    p=r.get("product",{})
    print(f"create {pr['handle']}: [{st}] id={p.get('id')} variant={p.get('variants',[{}])[0].get('id')} inv={p.get('variants',[{}])[0].get('inventory_quantity')}")
    created.append(p); time.sleep(0.6)
# ensure published to Online Store channel
print(f"\n{len(created)} products. Verifying inventory + publish:")
st,prods=req("GET",f"{API}/products.json?limit=250")
for p in prods.get("products",[]):
    v=p["variants"][0]
    print(f"  {p['handle']}: ¥{v['price']} inv={v.get('inventory_quantity')} status={p['status']} published={bool(p.get('published_at'))}")
print("PRODUCTS_DONE")
