from playwright.sync_api import sync_playwright
import pathlib
from PIL import Image
exe="/home/ubuntucc/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"
order=["cover","index","shop","farmers","farm","about","faq","delivery","product","404"]
outdir=pathlib.Path("walkthrough/build/boardpng"); outdir.mkdir(exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe, args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1500,"height":1000}, device_scale_factor=2)
    for name in order:
        url="file://"+str(pathlib.Path(f"walkthrough/build/boards/{name}.html").resolve())
        pg.goto(url, wait_until="load")
        if name!="cover":
            try: pg.wait_for_function("document.body.dataset.ready==='1'", timeout=8000)
            except Exception: print("WARN ready timeout", name)
        pg.wait_for_timeout(150)
        out=outdir/f"{name}.png"
        pg.screenshot(path=str(out), full_page=True)
        print(name, Image.open(out).size)
    b.close()
