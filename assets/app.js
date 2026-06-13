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

// ---- inject live floating/spinning strawberry orbs into bold sections ----
(function(){
  var spots=[
    {sel:'.hero', css:'width:300px;height:300px;right:-70px;top:-40px;opacity:.1'},
    {sel:'.statement', css:'width:240px;height:240px;left:-90px;bottom:-70px;opacity:.14'},
    {sel:'.page-hero', css:'width:260px;height:260px;right:-80px;top:-60px;opacity:.1'},
    {sel:'#club .band', css:'width:220px;height:220px;right:30px;bottom:-90px;opacity:.16'},
    {sel:'.farmers', css:'width:280px;height:280px;left:-90px;top:30px;opacity:.08'}
  ];
  spots.forEach(function(s){
    document.querySelectorAll(s.sel).forEach(function(sec){
      sec.classList.add('has-orb');
      var orb=document.createElement('div'); orb.className='berry-orb'; orb.setAttribute('style',s.css);
      orb.style.animationDelay=(Math.random? '' : '0s'); // deterministic
      sec.insertBefore(orb, sec.firstChild);
    });
  });
})();
