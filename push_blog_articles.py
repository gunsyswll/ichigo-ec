#!/usr/bin/env python3
"""Publish the 4 strawberry blog articles to the Shopify "News" blog.

Run when DNS to the myshopify domain resolves (it has been intermittent on
this host). Idempotent: updates an existing article if one with the same
handle already exists, otherwise creates it. Reuses the client_credentials
grant to mint a fresh shpat_ token (the stored SHOPIFY_ADMIN_TOKEN goes stale).

    python3 push_blog_articles.py

Requires ~/.ichigo-shopify.env (chmod 600) with SHOPIFY_CLIENTID / SHOPIFY_SECRET
/ SHOPIFY_STORE. Uses only stdlib + the local article HTML files.
"""
import json, os, re, sys, urllib.request, urllib.error

API = "2024-10"
ENV = os.path.expanduser("~/.ichigo-shopify.env")
ARTICLES = [
    ("news-japanese-strawberry-varieties.html",
     "A Guide to Japanese Strawberry Varieties", "japanese-strawberry-varieties",
     "Amaou, Tochiotome, Beni Hoppe, Skyberry and rare white strawberries.",
     "japanese strawberries, strawberry varieties, amaou, tochiotome, skyberry, guide"),
    ("news-japanese-strawberry-season.html",
     "When Are Japanese Strawberries in Season?", "japanese-strawberry-season",
     "Why Japan's strawberry season peaks in winter and spring.",
     "japanese strawberries, strawberry season, winter strawberries, guide"),
    ("news-how-to-store-strawberries.html",
     "How to Store Strawberries So They Stay Fresh", "how-to-store-strawberries",
     "Refrigerate, keep dry, don't wash until eating.",
     "how to store strawberries, keep strawberries fresh, tips"),
    ("news-why-japanese-strawberries-premium.html",
     "Why Are Japanese Strawberries So Premium?", "why-japanese-strawberries-premium",
     "The hand cultivation, grading and gift culture behind the price.",
     "japanese strawberries, premium fruit, why expensive, story"),
]


def load_env():
    env = {}
    with open(ENV) as f:
        for line in f:
            line = line.strip()
            if line and "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def extract_body(path):
    html = open(path, encoding="utf-8").read()
    m = re.search(r'<section style="padding:44px 0 84px"><div class="post">(.*?)</div></section>', html, re.S)
    body = m.group(1).strip()
    # convert asset-relative refs to absolute GitHub Pages URLs so images resolve in the blog
    body = body.replace('src="assets/', 'src="https://gunsyswll.github.io/ichigo-ec/assets/')
    return body


def req(url, token, method="GET", payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(url, data=data, method=method,
                               headers={"X-Shopify-Access-Token": token,
                                        "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read().decode())


def main():
    env = load_env()
    store = env["SHOPIFY_STORE"]
    tok = json.loads(urllib.request.urlopen(urllib.request.Request(
        f"https://{store}/admin/oauth/access_token",
        data=json.dumps({"client_id": env["SHOPIFY_CLIENTID"],
                         "client_secret": env["SHOPIFY_SECRET"],
                         "grant_type": "client_credentials"}).encode(),
        headers={"Content-Type": "application/json"}, method="POST"),
        timeout=30).read().decode())["access_token"]

    blogs = req(f"https://{store}/admin/api/{API}/blogs.json", tok)["blogs"]
    blog = next((b for b in blogs if b["title"].lower() == "news"), blogs[0])
    bid = blog["id"]
    print(f"Blog: {blog['title']} (id {bid})")

    existing = req(f"https://{store}/admin/api/{API}/blogs/{bid}/articles.json?limit=250", tok)["articles"]
    by_handle = {a.get("handle"): a["id"] for a in existing}

    for path, title, handle, excerpt, tags in ARTICLES:
        body = extract_body(path)
        art = {"title": title, "author": "Ichigo", "handle": handle,
               "body_html": body, "summary_html": excerpt, "tags": tags,
               "published": True}
        if handle in by_handle:
            aid = by_handle[handle]
            req(f"https://{store}/admin/api/{API}/blogs/{bid}/articles/{aid}.json",
                tok, "PUT", {"article": {**art, "id": aid}})
            print(f"  updated: {title}")
        else:
            res = req(f"https://{store}/admin/api/{API}/blogs/{bid}/articles.json",
                      tok, "POST", {"article": art})
            print(f"  created: {title} (id {res['article']['id']})")

    final = req(f"https://{store}/admin/api/{API}/blogs/{bid}/articles.json?limit=250", tok)["articles"]
    print(f"Blog now has {len(final)} articles: " + ", ".join(a["title"] for a in final))


if __name__ == "__main__":
    try:
        main()
    except urllib.error.URLError as e:
        print(f"NETWORK/DNS ERROR (retry later): {e}", file=sys.stderr)
        sys.exit(1)
