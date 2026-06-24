"""Create a monthly subscription selling plan on the Club product, then inspect which
app OWNS it (the owner is responsible for recurring billing — that's the thing to verify)."""
import os, json, subprocess
env=dict(l.strip().split("=",1) for l in open(os.path.expanduser("~/.ichigo-shopify.env")) if "=" in l and not l.startswith("#"))
S=env["SHOPIFY_STORE"].strip().rstrip("/").replace("https://","").replace("http://","")
CID=env["SHOPIFY_CLIENTID"].strip(); SEC=env["SHOPIFY_SECRET"].strip()
TOK=json.loads(subprocess.run(["curl","-sS","-m","30","-X","POST",f"https://{S}/admin/oauth/access_token","-H","Content-Type: application/json","-d",json.dumps({"client_id":CID,"client_secret":SEC,"grant_type":"client_credentials"})],capture_output=True,text=True).stdout)["access_token"]
def gql(q,v=None):
    b={"query":q}
    if v is not None: b["variables"]=v
    open("/tmp/_sp.json","w").write(json.dumps(b))
    return json.loads(subprocess.run(["curl","-sS","-m","40","-X","POST",f"https://{S}/admin/api/2024-10/graphql.json","-H",f"X-Shopify-Access-Token: {TOK}","-H","Content-Type: application/json","--data-binary","@/tmp/_sp.json"],capture_output=True,text=True).stdout)

# Club product gid
club="gid://shopify/Product/10313830138136"
# already has a plan?
ex=gql("{ sellingPlanGroups(first:20){ edges{ node{ id name appId merchantCode } } } }")
groups=ex.get("data",{}).get("sellingPlanGroups",{}).get("edges",[]) if ex.get("data") else []
print("existing groups:", [(e['node']['name'], e['node']['appId']) for e in groups] or "none")

m="""mutation create($input: SellingPlanGroupInput!, $res: SellingPlanGroupResourceInput!) {
  sellingPlanGroupCreate(input: $input, resources: $res) {
    sellingPlanGroup { id name appId merchantCode sellingPlans(first:5){ edges{ node{ id name } } } }
    userErrors { field message }
  }
}"""
inp={
 "name":"Japanese Strawberry Club",
 "merchantCode":"strawberry-club-monthly",
 "options":["Delivery frequency"],
 "sellingPlansToCreate":[{
   "name":"Monthly delivery",
   "options":"Every month",
   "category":"SUBSCRIPTION",
   "billingPolicy":{"recurring":{"interval":"MONTH","intervalCount":1}},
   "deliveryPolicy":{"recurring":{"interval":"MONTH","intervalCount":1}},
   "pricingPolicies":[{"fixed":{"adjustmentType":"PERCENTAGE","adjustmentValue":{"percentage":0.0}}}]
 }]
}
res={"productIds":[club]}
r=gql(m,{"input":inp,"res":res})
node=(r.get("data") or {}).get("sellingPlanGroupCreate") or {}
if node.get("userErrors"): print("USER ERRORS:", json.dumps(node["userErrors"],indent=1))
elif r.get("errors"): print("GQL ERRORS:", json.dumps(r["errors"],indent=1)[:600])
else:
    g=node["sellingPlanGroup"]
    print("created group:", g["name"], "| id:", g["id"], "| appId:", g["appId"])
    print("plans:", [e["node"]["name"] for e in g["sellingPlans"]["edges"]])
# what app is the Subscriptions app vs us?
print("\nour appId (caller):", gql("{ currentAppInstallation{ id } }").get("data",{}).get("currentAppInstallation",{}).get("id"))
print("DONE")
