#!/usr/bin/env bash
cd "$(dirname "$0")"
# content-hash cache-bust: a fresh token whenever css/js change, so the CDN
# can never serve a stale asset under a reused ?v= filename.
VER=$(cat assets/styles.css assets/app.js | md5sum | cut -c1-8)
stamp(){ sed -E "s|(assets/(styles\.css\|app\.js))\?v=[A-Za-z0-9]+|\1?v=$VER|g"; }
build(){ # $1=name $2=title
  { sed "s/__TITLE__/$2/" partials/head.html; cat "src/$1.body.html"; cat partials/foot.html; } | stamp > "$1.html"
  echo "built $1.html"
}
build shop "Shop & Reserve"
build farmers "Our Farmers"
build farm "Berry Farm"
build about "About Us"
build faq "Help & FAQ"
build delivery "Delivery & Freshness"
build product "Standard Strawberry Box"
# index.html is standalone — stamp it in place
stamp < index.html > index.html.tmp && mv index.html.tmp index.html
stamp < 404.html > 404.html.tmp && mv 404.html.tmp 404.html
echo "stamped v=$VER"
