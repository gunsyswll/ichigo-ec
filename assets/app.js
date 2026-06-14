// Ichigo — shared interactions: scroll reveals, mobile nav, header, parallax
(function(){
  // ---- scroll-reveal (Apple-like staggered fade/slide) ----
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        // stagger siblings sharing a [data-stagger] parent
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'});

  function wire(){
    document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el); });
    // auto-stagger children inside [data-stagger]
    document.querySelectorAll('[data-stagger]').forEach(function(group){
      Array.prototype.forEach.call(group.children, function(child, i){
        if(child.hasAttribute('data-reveal')) child.style.setProperty('--d', (i*0.08)+'s');
      });
    });
  }
  if(document.readyState!=='loading') wire(); else document.addEventListener('DOMContentLoaded', wire);

  // ---- mobile nav ----
  document.addEventListener('click', function(ev){
    var b = ev.target.closest('.burger');
    if(b){ var l=document.querySelector('nav.links'); if(l) l.classList.toggle('open'); }
  });

  // ---- header elevation + generalized image parallax ----
  var pxEls=[]; function collectPx(){ pxEls=[].slice.call(document.querySelectorAll('[data-parallax]')); }
  if(document.readyState!=='loading') collectPx(); else document.addEventListener('DOMContentLoaded', collectPx);
  var lastY=-1;
  function onScroll(){
    var y=window.scrollY; if(y===lastY) return; lastY=y;
    var h=document.querySelector('header'); if(h) h.style.boxShadow = y>10 ? '0 6px 20px -16px rgba(43,36,32,.5)':'none';
    var vh=window.innerHeight;
    pxEls.forEach(function(el){
      var r=el.getBoundingClientRect(); if(r.bottom<-120||r.top>vh+120) return;
      var sp=parseFloat(el.getAttribute('data-parallax'))||0.1;
      var prog=((r.top+r.height/2)-vh/2)/vh;            // ~ -0.5 … 0.5
      if(el.classList.contains('img')) el.style.backgroundPosition='center '+(50+prog*sp*120).toFixed(1)+'%';
      else el.style.transform='translate3d(0,'+(prog*-sp*120).toFixed(1)+'px,0)';
    });
  }
  window.addEventListener('scroll', function(){ window.requestAnimationFrame(onScroll); }, {passive:true});
  window.addEventListener('resize', collectPx);

  // ---- number count-ups ----
  function countUp(el){
    var target=parseFloat(el.getAttribute('data-count')), pre=el.getAttribute('data-pre')||'', suf=el.getAttribute('data-suf')||'';
    var dur=1300, t0=null, comma=target>=1000, dec=!Number.isInteger(target);
    function tick(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1), e=1-Math.pow(1-p,3), v=target*e;
      el.textContent=pre+(comma?Math.round(v).toLocaleString():(dec?v.toFixed(1):Math.round(v)))+suf; if(p<1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }
  var cio=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ countUp(e.target); cio.unobserve(e.target);} }); }, {threshold:0.6});
  function wireCount(){ document.querySelectorAll('[data-count]').forEach(function(el){ cio.observe(el); }); }
  if(document.readyState!=='loading') wireCount(); else document.addEventListener('DOMContentLoaded', wireCount);
})();

// ---- mark active nav link by current page ----
(function(){
  var page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.links a').forEach(function(a){
    var href = (a.getAttribute('href')||'').split('#')[0];
    if(href===page) a.classList.add('active');
  });
})();

// ---- fill photo blocks with real imagery (placeholder set; swap for final shots) ----
(function(){
  var STRAW=['str-bunch','str-farm','str-red','str-one','str-hold'];
  var PEOPLE=['hold-bunch','hold-plant','hold-box','hand-berry'];
  var si=0,pi=0, u=function(n){return "url('assets/img/"+n+".jpg')";};
  document.querySelectorAll('.ph').forEach(function(el){
    if(el.classList.contains('grey')||el.classList.contains('map-ph')||el.hasAttribute('data-noimg')) return;
    el.classList.add('img'); el.style.backgroundImage=u(STRAW[si++%STRAW.length]);
  });
  document.querySelectorAll('.farmer .ph,.fc .ph,.detail-hero>.ph,.method .ph,.story-grid>.ph,[data-img="people"]').forEach(function(el){
    if(el.classList.contains('grey')||el.classList.contains('map-ph')) return;
    el.classList.add('img'); el.style.backgroundImage=u(PEOPLE[pi++%PEOPLE.length]);
  });
})();

// ---- shop: filter + pagination ----
(function(){
  var grid=document.querySelector('.shop-grid'); if(!grid) return;
  var tabs=document.querySelectorAll('.filters a[data-filter]');
  var bar=document.querySelector('.shop-bar span');
  var pager=document.querySelector('.pager');
  // data-cat sits on .card-body — resolve each to its .card wrapper
  var cards=[].slice.call(grid.querySelectorAll('[data-cat]')).map(function(el){
    var card=el.closest('.card')||el; card.setAttribute('data-cat', el.getAttribute('data-cat')); return card;
  });
  var PER=6, filter='all', page=1;
  function matches(){ return cards.filter(function(c){ return filter==='all' || (' '+c.getAttribute('data-cat')+' ').indexOf(' '+filter+' ')>=0; }); }
  function render(scroll){
    var m=matches(), pages=Math.max(1,Math.ceil(m.length/PER));
    if(page>pages) page=pages;
    cards.forEach(function(c){ c.style.display='none'; });
    m.slice((page-1)*PER, page*PER).forEach(function(c){ c.style.display=''; });
    if(bar){ var a=m.length?(page-1)*PER+1:0, b=Math.min(page*PER,m.length);
      bar.innerHTML='Showing <b style="color:var(--ink)">'+a+'–'+b+'</b> of '+m.length+' product'+(m.length!==1?'s':''); }
    if(pager){ var h='<a href="#" data-pg="prev">‹</a>'; for(var i=1;i<=pages;i++) h+='<a href="#" data-pg="'+i+'"'+(i===page?' class="active"':'')+'>'+i+'</a>';
      h+='<a href="#" data-pg="next">›</a>'; pager.innerHTML=h; pager.style.display = pages>1?'':'none'; }
    if(scroll){ var t=grid.getBoundingClientRect().top+window.scrollY-110; window.scrollTo({top:t,behavior:'smooth'}); }
  }
  if(pager) pager.addEventListener('click',function(e){ var a=e.target.closest('a'); if(!a)return; e.preventDefault();
    var v=a.getAttribute('data-pg'), pages=Math.ceil(matches().length/PER);
    if(v==='prev') page=Math.max(1,page-1); else if(v==='next') page=Math.min(pages,page+1); else page=parseInt(v,10); render(true); });
  tabs.forEach(function(t){ t.addEventListener('click',function(e){ e.preventDefault();
    tabs.forEach(function(x){x.classList.remove('active')}); t.classList.add('active');
    filter=t.getAttribute('data-filter'); page=1; render(true); }); });
  render(false);
})();

// ---- inject a visible floating + spinning strawberry into the bold sections ----
(function(){
  var seeds='';
  var sp=[[40,72,20],[54,66,-15],[68,68,12],[82,76,-22],[34,92,18],[48,86,-10],[62,84,8],[76,88,-18],[88,98,15],[44,108,-12],[58,104,6],[72,106,-16],[52,122,10],[66,122,-8]];
  sp.forEach(function(s){ seeds+='<ellipse cx="'+s[0]+'" cy="'+s[1]+'" rx="1.7" ry="2.9" transform="rotate('+s[2]+' '+s[0]+' '+s[1]+')"/>'; });
  var BERRY='<svg viewBox="0 0 120 152" xmlns="http://www.w3.org/2000/svg">'
    +'<path fill="#2f7e48" d="M58 8h4v15h-4z"/>'
    +'<path fill="#43985a" d="M60 16c-5 11-15 14-23 12 9 8 9 14 5 20 9-4 14-3 18 3 4-6 9-7 18-3-4-6-4-12 5-20-8 2-18-1-23-12z"/>'
    +'<path fill="#D94050" d="M60 40C29 36 15 61 21 89c6 28 29 51 39 55 10-4 33-27 39-55 6-28-9-53-39-49z"/>'
    +'<path fill="#B22F40" opacity=".32" d="M60 40c30-4 45 21 39 49-6 28-29 51-39 55z"/>'
    +'<ellipse cx="42" cy="66" rx="9" ry="15" fill="#fff" opacity=".20" transform="rotate(-22 42 66)"/>'
    +'<g class="sb-seed">'+seeds+'</g></svg>';
  var spots=[
    {sel:'.hero',        css:'width:340px;height:340px;right:-90px;bottom:-120px;opacity:.5'},
    {sel:'.statement',   css:'width:300px;height:300px;left:-110px;top:-90px;opacity:.5'},
    {sel:'.page-hero',   css:'width:300px;height:300px;right:-100px;bottom:-130px;opacity:.45'},
    {sel:'#club .band',  css:'width:260px;height:260px;right:24px;bottom:-110px;opacity:.55'},
    {sel:'.farmers',     css:'width:320px;height:320px;left:-110px;top:20px;opacity:.85'},
    {sel:'.news',        css:'width:260px;height:260px;left:-90px;bottom:-110px;opacity:.4'}
  ];
  var d=0;
  spots.forEach(function(s){
    document.querySelectorAll(s.sel).forEach(function(sec){
      sec.classList.add('has-orb');
      var orb=document.createElement('div'); orb.className='berry-orb';
      orb.setAttribute('style', s.css+';animation-delay:'+(d* -2.3)+'s,'+(d* -1.1)+'s'); d++;
      orb.innerHTML=BERRY;
      sec.insertBefore(orb, sec.firstChild);
    });
  });
})();

// ---- photo audit overlay: append ?audit=photos to any page to tag every photo spot (Pnn) ----
(function(){
  if(!/[?&]audit=photos/.test(location.search)) return;
  function run(){
    var s=document.createElement('style');           // audit mode: reveal everything so all photos show at once
    s.textContent='[data-reveal]{opacity:1!important;transform:none!important}';
    document.head.appendChild(s);
    document.querySelectorAll('.ph').forEach(function(el,i){
      if(getComputedStyle(el).position==='static') el.style.position='relative';
      el.style.outline='3px solid #1565c0'; el.style.outlineOffset='-3px';
      var id='P'+('0'+(i+1)).slice(-2);
      var b=document.createElement('div');
      b.textContent='📷 '+id;
      b.style.cssText='position:absolute;top:6px;left:6px;z-index:60;background:#1565c0;color:#fff;'+
        'font:700 12px/1.4 Outfit,sans-serif;letter-spacing:.04em;padding:3px 9px;border-radius:6px;'+
        'box-shadow:0 2px 10px rgba(0,0,0,.45);pointer-events:none';
      el.appendChild(b);
    });
    var n=document.querySelectorAll('.ph').length, t=document.createElement('div');
    t.textContent='PHOTO AUDIT · '+n+' spots on this page · see PHOTOS.md';
    t.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1565c0;color:#fff;'+
      'text-align:center;font:600 13px/2.6 Outfit,sans-serif;letter-spacing:.05em';
    document.body.appendChild(t);
  }
  if(document.readyState!=='loading') run(); else document.addEventListener('DOMContentLoaded',run);
})();
