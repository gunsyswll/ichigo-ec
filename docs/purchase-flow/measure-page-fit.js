const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({headless:'new'});
  const p = await b.newPage();
  await p.goto('file://' + process.argv[2], {waitUntil:'networkidle0'});
  const r = await p.evaluate(() => {
    const px2mm = 25.4/96;
    return [...document.querySelectorAll('.page')].map((el,i) => {
      // real content height = last child bottom - page top + bottom padding
      const cs = getComputedStyle(el);
      const padB = parseFloat(cs.paddingBottom);
      const kids = [...el.children];
      const last = kids[kids.length-1];
      const need = (last.offsetTop + last.offsetHeight) + padB;
      return { page:i+1, clientH:+(el.clientHeight*px2mm).toFixed(1),
               needH:+(need*px2mm).toFixed(1),
               overflow:+((need - el.clientHeight)*px2mm).toFixed(1),
               scrollOver:+((el.scrollHeight-el.clientHeight)*px2mm).toFixed(1) };
    });
  });
  console.table(r);
  const bad = r.filter(x => x.overflow > 0.5);
  console.log(bad.length ? 'OVERFLOW on pages: ' + bad.map(x=>x.page).join(',') : 'ALL PAGES FIT');
  await b.close();
})();
