#!/usr/bin/env python3
"""Generate annotated 'speech-bubble' walkthrough boards for the Ichigo site."""
import json, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent          # walkthrough/build
SHOTS = ROOT / "shots"
BOARDS = ROOT / "boards"; BOARDS.mkdir(exist_ok=True)
M = json.load(open(ROOT / "measure.json"))

# ---- page-level metadata -------------------------------------------------
PAGE = {
 "index":   ("Home", "index.html", "The storefront's front door — sets the premium-but-approachable tone and funnels visitors to reserve the next arrival."),
 "shop":    ("Shop / Reserve", "shop.html", "The catalogue — browse and reserve from the current and upcoming lots."),
 "farmers": ("Farmers", "farmers.html", "Builds trust — the people and places behind every box (the 親近感 / closeness pillar)."),
 "farm":    ("Farm Detail", "farm.html", "A deep-dive on a single farm — story, method, and the boxes it grows."),
 "about":   ("About", "about.html", "The company story and the import / logistics credibility."),
 "faq":     ("FAQ", "faq.html", "Self-service answers that remove pre-purchase friction."),
 "delivery":("Delivery & Freshness", "delivery.html", "Sets delivery expectations and reassures on freshness — key for a pre-paid, perishable product."),
 "product": ("Product Detail", "product.html", "The conversion page — everything needed to reserve one box."),
 "404":     ("404 — Not Found", "404.html", "A friendly, on-brand dead-end that routes lost visitors back to shopping."),
}

# ---- per-block callout copy: page -> {block_index: (title, purpose)} ------
# Only listed indices get a numbered callout. Shared chrome (announcement bar,
# header, footer) is annotated once on Home and omitted elsewhere to keep each
# board focused on what is new to that page.
COPY = {
 "index": {
   0:("Announcement bar","Rotating promo line for the current drop — new arrival, pre-orders open, limited boxes."),
   1:("Header & navigation","Logo, primary menu (Shop/Reserve, Subscription, Farmers, How It Works, FAQ), account + cart, and the Reserve Now button. Persistent on every page."),
   2:("Hero","First impression: the headline promise, lead copy, two CTAs (Reserve Next Arrival / Join Waitlist) and trust badges over the hero image."),
   3:("Next-arrival strip","At-a-glance lot facts — arrival date, reservation deadline, delivery window and boxes available — with a Reserve CTA."),
   4:("Keyword marquee","Scrolling ribbon of brand cues (varieties, Chiba, cold-chain, 頒布会, single-origin) for rhythm and texture."),
   5:("Choose your box","Three featured products — Standard Box, Premium Gift Box and the 頒布会 Club — as image cards linking to product pages."),
   6:("Why it's different","Short value points on what sets Japanese strawberries apart: carefully grown, peak-ripeness, cold-chain."),
   7:("Brand statement","A bold full-bleed 'Grown in Japan. Loved in the Philippines' moment that frames the 'little luxury' positioning."),
   8:("Meet the farmers","'A farmer you know' — two grower cards that open their stories. The 親近感 / closeness pillar."),
   9:("How it works · the journey","Animated Chiba → your-door map plus the step timeline: Reserve → Harvested & Flown → Quality-Checked → Delivered."),
   10:("頒布会 Club band","Promo for the monthly subscription club — a new seasonal lot at your door every month."),
   11:("Trust & service cards","Reassurance trio: official import & local management, delivery & freshness, and the quality guarantee."),
   12:("Newsletter capture","Email sign-up so customers never miss a small, fast-selling arrival."),
   13:("FAQ teaser","The most common pre-purchase questions as expandable accordions, with a link to the full FAQ."),
   14:("Footer","Full sitemap — shop, information, policies and account links — plus payment methods (GCash / Maya / Visa / Mastercard)."),
 },
 "shop": {
   2:("Page hero + filters","'Shop & Reserve' title, filter tabs (All / This Week / Pre-order / Gift / Subscription / Sold-Out) and the arrival/deadline summary."),
   3:("Product grid","Every box, gift set, subscription and limited lot as a card with status tag, price and a Reserve action — with working filters, sort and pagination."),
 },
 "farmers": {
   2:("Page hero + stats","'Meet the Farmers Behind Every Box' with headline figures — partner farms, region and combined experience."),
   3:("The two growers","Why we work with only two farms — a card per farm with story snippet, variety tags and a link to the farm page."),
   4:("Our standard","The criteria every partner farm must meet: quality, sustainable practice and cold-chain readiness."),
   5:("Where they grow","A real map of Japan highlighting Chiba — where the farms are — with a short note."),
 },
 "farm": {
   2:("Breadcrumb","Back-link to the Farmers list for easy navigation."),
   3:("Farm hero","Farm name, location (Chiba) and a quick-facts panel (specialties, season, philosophy line)."),
   4:("The story","The grower's background and what drives the farm."),
   5:("Growing method & philosophy","How the berries are grown — the craft points that justify the price."),
   6:("Grower's quote","A pull-quote in the farmer's own voice — the emotional, human proof point."),
   7:("Inside the farm","A photo gallery of field, harvest and berries."),
   8:("Boxes from this farm","The products this grower supplies, each with a Reserve action."),
   9:("Meet the other farmer","Cross-link to the second grower to keep visitors browsing."),
   10:("Closing CTA","'Bring this farm's strawberries home' — a final reserve prompt."),
 },
 "about": {
   2:("Page hero","'Bringing Japan's Finest Strawberries to the Philippines' with section tabs."),
   3:("Our story & mission","Why the business exists, its values and headline stats."),
   4:("Officially imported & managed","Credential cards — licensed importer, cold-chain, customs clearance, food-safety."),
   5:("Japan → Philippines journey","The 6-step cold-chain timeline: Harvest → Quality Check → Cold-Chain Air → PH Customs → Local QC → Delivered (~36–48h door-to-door)."),
   6:("The team","Founder and team introductions — faces behind the brand."),
   7:("Closing CTA","A reserve prompt to convert readers who just learned the story."),
 },
 "faq": {
   2:("Page hero + search","'How can we help?' with a search field for instant lookup."),
   3:("Categories + Q&A","Grouped questions (Ordering & Reservation, Delivery, Products & Quality) as expandable accordions."),
   4:("Still have questions","Contact options — email, live chat, Messenger — for anything unanswered."),
 },
 "delivery": {
   2:("Page hero + stats","'Delivery & Freshness' headline with the key figures up top."),
   3:("Quick stats row","Delivery areas, lead time, shipping fee and the freshness guarantee, at a glance."),
   4:("Delivery area","Serviced regions with a coverage note / area checker."),
   5:("Shipping schedule","A weekly timeline from the reservation deadline through to delivery."),
   6:("Freshness guarantee","The promise — and exactly what happens if a box arrives less than perfect."),
   7:("Storage & handling","How to keep the berries at their best, with a downloadable guide."),
   8:("Closing CTA","A reserve prompt once expectations are set."),
 },
 "product": {
   2:("Breadcrumb","Path back to Shop and the parent category."),
   3:("Gallery + buy box","Main image with thumbnails, price, specs, quantity selector and the Reserve / Pre-order action — the core conversion unit."),
   4:("Grown by","The farm behind this box, a link to its story and a QR-traceability nod."),
   5:("You might also like","Related products to lift basket size."),
 },
 "404": {
   0:("404 page","A floating strawberry, the line '404 — this one rolled off the table', and buttons back to Home / Shop with quick links — a friendly recovery, not a dead end."),
 },
}

# ---- layout constants (CSS px; rendered at 2x) ---------------------------
SHOT_W = 720
GUT_GAP = 64
GUT_W   = 560
PAD     = 60
HEADER_H = 150

RED="#D94050"; RED_DEEP="#B22F40"; CREAM="#FBF6F1"; CREAM2="#F3EBE3"
INK="#2B2420"; GREIGE="#6E6256"; LINE="rgba(110,98,86,.20)"

def esc(s): return html.escape(s, quote=True)

def build_board(name):
    pg = M[name]
    title, fname, purpose = PAGE[name]
    copy = COPY[name]
    scale = SHOT_W / pg["docW"]
    shot_h = pg["docH"] * scale
    img_rel = f"../shots/{name}.png"

    # ordered annotated blocks
    blocks = [it for it in pg["items"] if it["i"] in copy]
    markers = []   # (badge, markerX, markerY)
    bubbles = []   # html for bubble cards (absolute, JS will reflow)
    for n, it in enumerate(blocks, 1):
        t, desc = copy[it["i"]]
        cy = (it["top"] + it["h"]/2) * scale
        cy = max(20, min(cy, shot_h-20))
        markers.append((n, cy))
        bubbles.append(
            f'<div class="bub" data-n="{n}" data-y="{cy:.1f}">'
            f'<div class="bnum">{n}</div>'
            f'<div class="btxt"><h4>{esc(t)}</h4><p>{esc(desc)}</p></div>'
            f'</div>'
        )

    # markers overlaid on shot
    marker_html = "".join(
        f'<div class="pin" style="top:{cy:.1f}px">{n}</div>' for n,cy in markers
    )
    board_min_h = max(shot_h, 1) + HEADER_H + PAD*2

    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{{--red:{RED};--red-deep:{RED_DEEP};--cream:{CREAM};--cream2:{CREAM2};--ink:{INK};--greige:{GREIGE};--line:{LINE}}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:Outfit,sans-serif;color:var(--ink);background:
  radial-gradient(140% 100% at 85% -10%, #ffffff, var(--cream) 55%, var(--cream2));
  -webkit-font-smoothing:antialiased}}
.board{{position:relative;width:{PAD*2+SHOT_W+GUT_GAP+GUT_W}px;min-height:{board_min_h:.0f}px;padding:{PAD}px}}
.head{{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;height:{HEADER_H-40}px;border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:34px}}
.head .l .file{{font-size:.74rem;letter-spacing:.22em;text-transform:uppercase;color:var(--red);font-weight:600;font-family:Outfit}}
.head .l h1{{font-family:'Libre Baskerville',serif;font-weight:400;font-size:2.5rem;margin:6px 0 6px}}
.head .l p{{color:var(--greige);max-width:46em;font-size:1.02rem;line-height:1.5}}
.head .r{{text-align:right;color:var(--greige);font-size:.8rem;letter-spacing:.04em;flex:none}}
.head .r .brand{{font-family:'Libre Baskerville',serif;color:var(--red);font-size:1.15rem;letter-spacing:.04em}}
.stage{{position:relative}}
.shot{{position:absolute;left:0;top:0;width:{SHOT_W}px}}
.shot img{{width:{SHOT_W}px;display:block;border-radius:14px;border:1px solid var(--line);
  box-shadow:0 30px 70px -34px rgba(43,36,32,.55)}}
.pin{{position:absolute;right:-15px;transform:translateY(-50%);
  width:30px;height:30px;border-radius:50%;background:var(--red);color:#fff;
  font-family:'Libre Baskerville',serif;font-size:.86rem;font-weight:700;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 12px rgba(178,47,64,.5);border:2.5px solid #fff;z-index:5}}
svg.leaders{{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;z-index:2;pointer-events:none}}
.gut{{position:absolute;left:{SHOT_W+GUT_GAP}px;top:0;width:{GUT_W}px}}
.bub{{position:absolute;left:0;width:{GUT_W}px;display:flex;gap:14px;align-items:flex-start;
  background:#fff;border:1px solid var(--line);border-left:4px solid var(--red);
  border-radius:13px;padding:15px 18px 15px 16px;
  box-shadow:0 14px 34px -22px rgba(43,36,32,.5)}}
.bub .bnum{{flex:none;width:26px;height:26px;border-radius:50%;background:var(--cream2);color:var(--red-deep);
  font-family:'Libre Baskerville',serif;font-weight:700;font-size:.82rem;
  display:flex;align-items:center;justify-content:center;margin-top:1px}}
.bub h4{{font-family:'Libre Baskerville',serif;font-weight:400;font-size:1.04rem;margin-bottom:4px;line-height:1.25}}
.bub p{{font-size:.9rem;line-height:1.5;color:var(--greige)}}
</style></head>
<body>
<div class="board">
  <div class="head">
    <div class="l"><div class="file">{esc(fname)}</div><h1>{esc(title)}</h1><p>{esc(purpose)}</p></div>
    <div class="r"><div class="brand">Ichigo ／苺</div><div>Website Walkthrough</div></div>
  </div>
  <div class="stage" id="stage">
    <div class="shot" id="shot"><img src="{img_rel}" id="shotimg">{marker_html}</div>
    <svg class="leaders" id="leaders"></svg>
    <div class="gut" id="gut">{''.join(bubbles)}</div>
  </div>
</div>
<script>
const SHOT_W={SHOT_W}, GUT_X={SHOT_W+GUT_GAP}, GAP=18;
function layout(){{
  const gut=document.getElementById('gut');
  const bubs=[...gut.querySelectorAll('.bub')];
  // desired center y = marker y; place top = y - h/2, then resolve overlaps downward
  let prevBottom=0;
  bubs.sort((a,b)=>(+a.dataset.y)-(+b.dataset.y));
  bubs.forEach(b=>{{
    const h=b.offsetHeight;
    let top=(+b.dataset.y)-h/2;
    if(top<prevBottom+GAP) top=prevBottom+GAP;
    if(top<0) top=0;
    b.style.top=top+'px';
    prevBottom=top+h;
  }});
  // grow stage / board if bubbles run past the shot
  const stage=document.getElementById('stage');
  const shotH=document.getElementById('shotimg').offsetHeight;
  const need=Math.max(shotH, prevBottom)+4;
  stage.style.height=need+'px';
  // draw leaders marker -> bubble
  const svg=document.getElementById('leaders');
  svg.setAttribute('viewBox',`0 0 ${{stage.offsetWidth}} ${{need}}`);
  svg.style.height=need+'px';
  let paths='';
  document.querySelectorAll('.pin').forEach(pin=>{{
    const n=pin.textContent.trim();
    const bub=gut.querySelector(`.bub[data-n="${{n}}"]`);
    if(!bub) return;
    const my=parseFloat(pin.style.top);            // marker center y (within shot)
    const mx=SHOT_W;                                // marker sits at right edge of shot
    const by=bub.offsetTop+22;                      // bubble anchor near its number
    const bx=GUT_X;                                 // bubble left edge
    const midx=(mx+bx)/2;
    paths+=`<path d="M ${{mx}} ${{my}} C ${{midx}} ${{my}}, ${{midx}} ${{by}}, ${{bx-2}} ${{by}}" `
         +`fill="none" stroke="{RED}" stroke-width="1.6" stroke-opacity=".55"/>`;
    paths+=`<circle cx="${{mx}}" cy="${{my}}" r="3.2" fill="{RED}"/>`;
  }});
  svg.innerHTML=paths;
  document.body.dataset.ready="1";
}}
window.addEventListener('load',()=>{{ if(document.fonts&&document.fonts.ready){{document.fonts.ready.then(()=>setTimeout(layout,60));}} else setTimeout(layout,120); }});
</script>
</body></html>"""

for name in PAGE:
    out = BOARDS / f"{name}.html"
    out.write_text(build_board(name))
    print("wrote", out.name)
print("done")
