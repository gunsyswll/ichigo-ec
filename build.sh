#!/usr/bin/env bash
cd "$(dirname "$0")"
build(){ # $1=name $2=title
  { sed "s/__TITLE__/$2/" partials/head.html; cat "src/$1.body.html"; cat partials/foot.html; } > "$1.html"
  echo "built $1.html"
}
build shop "Shop & Reserve"
build farmers "Our Farmers"
build farm "Berry Farm"
build about "About Us"
build faq "Help & FAQ"
build delivery "Delivery & Freshness"
build product "Standard Strawberry Box"
