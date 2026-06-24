"""Brand the Shopify checkout to match Ichigo (Ripe Red accent, warm off-white,
rounded buttons) via the GraphQL Checkout Branding API. Basic-plan-allowed branding."""
import os, json, subprocess
env=dict(l.strip().split("=",1) for l in open(os.path.expanduser("~/.ichigo-shopify.env")) if "=" in l and not l.startswith("#"))
S=env["SHOPIFY_STORE"].strip().rstrip("/").replace("https://","").replace("http://","")
CID=env["SHOPIFY_CLIENTID"].strip(); SEC=env["SHOPIFY_SECRET"].strip()
TOK=json.loads(subprocess.run(["curl","-sS","-m","30","-X","POST",f"https://{S}/admin/oauth/access_token","-H","Content-Type: application/json","-d",json.dumps({"client_id":CID,"client_secret":SEC,"grant_type":"client_credentials"})],capture_output=True,text=True).stdout)["access_token"]
def gql(query,variables=None):
    body={"query":query}
    if variables is not None: body["variables"]=variables
    open("/tmp/_gq.json","w").write(json.dumps(body))
    out=subprocess.run(["curl","-sS","-m","60","-X","POST",f"https://{S}/admin/api/2024-10/graphql.json","-H",f"X-Shopify-Access-Token: {TOK}","-H","Content-Type: application/json","--data-binary","@/tmp/_gq.json"],capture_output=True,text=True).stdout
    return json.loads(out)

# 1) published checkout profile
r=gql("{ checkoutProfiles(first:10){ edges{ node{ id name isPublished } } } }")
profs=[e["node"] for e in r["data"]["checkoutProfiles"]["edges"]]
pid=next((p["id"] for p in profs if p["isPublished"]), profs[0]["id"])
print("checkout profile:", pid, [p["name"] for p in profs])

# 2) brand it
branding={
 "designSystem":{
   "colors":{
     "global":{"accent":"#D94050","brand":"#D94050"},
     "schemes":{
       "scheme1":{
         "base":{"background":"#FBF6F1","text":"#2B2320","accent":"#D94050"},
         "primaryButton":{"background":"#D94050","text":"#FFFFFF","accent":"#D94050",
                          "hover":{"background":"#BE2F3D","text":"#FFFFFF"}},
         "control":{"background":"#FFFFFF","border":"#9E8E7E","text":"#2B2320"}
       },
       "scheme2":{
         "base":{"background":"#FFFFFF","text":"#2B2320","accent":"#D94050"},
         "primaryButton":{"background":"#D94050","text":"#FFFFFF",
                          "hover":{"background":"#BE2F3D","text":"#FFFFFF"}}
       }
     }
   },
   "cornerRadius":{"base":8,"small":4,"large":12}
 }
}
m="""mutation upsert($id:ID!,$b:CheckoutBrandingInput!){
  checkoutBrandingUpsert(checkoutProfileId:$id, checkoutBrandingInput:$b){
    checkoutBranding{ designSystem{ colors{ global{ accent brand } schemes{ scheme1{ primaryButton{ background } base{ background } } } } cornerRadius{ base } } }
    userErrors{ field message }
  }
}"""
r=gql(m,{"id":pid,"b":branding})
if r.get("errors"):
    print("GQL ERRORS:", json.dumps(r["errors"],indent=1)[:800])
else:
    res=(r.get("data") or {}).get("checkoutBrandingUpsert") or {}
    if res.get("userErrors"): print("USER ERRORS:", json.dumps(res["userErrors"],indent=1)[:800])
    else: print("applied ✓:", json.dumps(res.get("checkoutBranding")))
print("BRANDING_DONE")
