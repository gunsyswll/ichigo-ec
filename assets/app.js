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

  // ---- subtle header elevation + hero parallax on scroll ----
  var hero = document.querySelector('[data-parallax]');
  var lastY = -1;
  function onScroll(){
    var y = window.scrollY;
    if(y===lastY) return; lastY=y;
    var h=document.querySelector('header');
    if(h) h.style.boxShadow = y>10 ? '0 6px 20px -16px rgba(43,36,32,.5)' : 'none';
    if(hero) hero.style.transform = 'translateY('+ (y*0.08) +'px)';
  }
  window.addEventListener('scroll', function(){ window.requestAnimationFrame(onScroll); }, {passive:true});
})();

// ---- mark active nav link by current page ----
(function(){
  var page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.links a').forEach(function(a){
    var href = (a.getAttribute('href')||'').split('#')[0];
    if(href===page) a.classList.add('active');
  });
})();
