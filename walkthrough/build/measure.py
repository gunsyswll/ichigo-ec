from playwright.sync_api import sync_playwright
import pathlib, json
exe="/home/ubuntucc/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"
pages=["index","shop","farmers","farm","about","faq","delivery","product","404"]
SCALE=2
out={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe, args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1280,"height":900}, device_scale_factor=SCALE)
    for name in pages:
        url="file://"+str(pathlib.Path(name+".html").resolve())
        pg.goto(url, wait_until="networkidle")
        pg.wait_for_timeout(450)  # let reveal/animations settle
        # force any scroll-reveal to visible
        pg.evaluate("""()=>{document.querySelectorAll('[data-reveal],[data-stagger],.reveal,[data-parallax]').forEach(e=>{e.style.opacity=1;e.style.transform='none';e.classList.add('in','visible','revealed');});}""")
        pg.wait_for_timeout(150)
        data=pg.evaluate("""() => {
          const kids=[...document.body.children].filter(e=>!['SCRIPT','STYLE','NOSCRIPT'].includes(e.tagName));
          const pick=(el,sel)=>{const n=el.querySelector(sel);return n?n.innerText.trim().replace(/\\s+/g,' '):''};
          const items=kids.map((e,i)=>{
            const r=e.getBoundingClientRect();
            return {
              i, tag:e.tagName, id:e.id||'', cls:(e.className||'').toString(),
              top:Math.round(r.top+window.scrollY), left:Math.round(r.left+window.scrollX),
              w:Math.round(r.width), h:Math.round(r.height),
              eyebrow: pick(e,'.eyebrow, .kicker, .announce-inner, .tag'),
              head: pick(e,'h1, h2, h3, .brand'),
              snip: (e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,140)
            };
          });
          return {docH: document.body.scrollHeight, docW: 1280, items};
        }""")
        shot="walkthrough/build/shots/%s.png"%name
        pg.screenshot(path=shot, full_page=True)
        data["shot"]=shot
        out[name]=data
        print(f"{name}: {len(data['items'])} blocks, docH={data['docH']}")
    b.close()
json.dump(out, open("walkthrough/build/measure.json","w"), indent=1, ensure_ascii=False)
print("saved measure.json")
