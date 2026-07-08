/* Ichigo wishlist — dependency-free localStorage engine.
   Storage key ichigo_wl_v1 holds a JSON array of
   {handle,id,title,price,image,url}. Everything is client-side and
   defensive: any failure degrades to an empty list, never throws. */
(function () {
  'use strict';
  var KEY = 'ichigo_wl_v1';

  function getList() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function save(list) {
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function has(handle) {
    var l = getList();
    for (var i = 0; i < l.length; i++) { if (l[i] && l[i].handle === handle) return true; }
    return false;
  }
  function remove(handle) {
    var l = getList().filter(function (x) { return x && x.handle !== handle; });
    save(l);
    return l;
  }
  function add(item) {
    var l = getList();
    if (!has(item.handle)) { l.push(item); save(l); }
    return l;
  }
  function toggle(item) {
    if (has(item.handle)) { remove(item.handle); return false; }
    add(item); return true;
  }
  function count() { return getList().length; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function updateBadges() {
    var n = count();
    var badges = document.querySelectorAll('[data-wl-count]');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = n;
      badges[i].style.display = n > 0 ? '' : 'none';
    }
  }

  function markButton(btn, saved) {
    btn.classList.toggle('is-saved', saved);
    btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    var label = btn.querySelector('[data-wl-label]');
    if (label) label.textContent = saved ? 'Saved' : 'Save';
    var title = btn.getAttribute('data-title') || 'this item';
    btn.setAttribute('aria-label', (saved ? 'Remove ' + title + ' from' : 'Save ' + title + ' to') + ' your wishlist');
  }

  function syncButtons() {
    var btns = document.querySelectorAll('[data-wl-toggle]');
    for (var i = 0; i < btns.length; i++) {
      markButton(btns[i], has(btns[i].getAttribute('data-handle')));
    }
  }

  function itemFromBtn(btn) {
    return {
      handle: btn.getAttribute('data-handle'),
      id: btn.getAttribute('data-id'),
      title: btn.getAttribute('data-title'),
      price: btn.getAttribute('data-price'),
      image: btn.getAttribute('data-image'),
      url: btn.getAttribute('data-url')
    };
  }

  function renderRoot() {
    var root = document.getElementById('wishlist-root');
    if (!root) return;
    var list = getList();
    if (!list.length) {
      root.innerHTML =
        '<div class="wl-empty" data-reveal>' +
          '<div class="wl-empty-heart" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.7-10-9.4C.7 9 1.5 5.6 4.5 4.6 6.7 3.9 9 4.8 10.2 6.6L12 9l1.8-2.4C15 4.8 17.3 3.9 19.5 4.6c3 1 3.8 4.4 2.5 7C19.5 16.3 12 21 12 21z"/></svg>' +
          '</div>' +
          '<h2>Your wishlist is empty</h2>' +
          '<p>Tap the heart on any strawberry box to save it here for later.</p>' +
          '<a class="btn btn-red" href="/collections/all">Browse boxes</a>' +
        '</div>';
      return;
    }
    var html = '<div class="wl-grid">';
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      html +=
        '<div class="wl-card" data-wl-item="' + esc(it.handle) + '">' +
          '<a class="wl-card-media" href="' + esc(it.url) + '" aria-label="' + esc(it.title) + '">' +
            (it.image ? '<img src="' + esc(it.image) + '" alt="' + esc(it.title) + '" loading="lazy">'
                      : '<span class="wl-noimg" aria-hidden="true">🍓</span>') +
          '</a>' +
          '<button type="button" class="wl-remove" data-wl-remove="' + esc(it.handle) + '" aria-label="Remove ' + esc(it.title) + ' from wishlist" title="Remove">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
          '<div class="wl-card-body">' +
            '<a href="' + esc(it.url) + '"><h3>' + esc(it.title) + '</h3></a>' +
            (it.price ? '<div class="wl-price">' + esc(it.price) + '</div>' : '') +
            '<a class="btn btn-red btn-block wl-view" href="' + esc(it.url) + '">View / Reserve</a>' +
          '</div>' +
        '</div>';
    }
    html += '</div>';
    root.innerHTML = html;
  }

  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var removeBtn = t.closest('[data-wl-remove]');
    if (removeBtn) {
      e.preventDefault();
      remove(removeBtn.getAttribute('data-wl-remove'));
      updateBadges();
      syncButtons();
      renderRoot();
      return;
    }
    var toggleBtn = t.closest('[data-wl-toggle]');
    if (toggleBtn) {
      e.preventDefault();
      var saved = toggle(itemFromBtn(toggleBtn));
      markButton(toggleBtn, saved);
      updateBadges();
      renderRoot();
    }
  }

  function init() {
    try {
      syncButtons();
      updateBadges();
      renderRoot();
      document.addEventListener('click', onClick);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
