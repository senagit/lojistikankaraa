(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const menu = $('#main-menu');
  const menuButton = $('.menu-toggle');
  const closeMenu = () => {
    if (!menu || !menuButton) return;
    menu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  };
  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('open', open);
      document.body.classList.toggle('nav-open', open);
    });
    menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); menuButton.focus(); }
    });
    const desktop = window.matchMedia('(min-width: 901px)');
    desktop.addEventListener('change', event => { if (event.matches) closeMenu(); });
  }

  const config = window.CAGLAR_TRACKING || {};
  const ga4 = /^G-[A-Z0-9]+$/.test(config.ga4Id || '') ? config.ga4Id : '';
  const ads = /^AW-\d+$/.test(config.adsId || '') ? config.adsId : '';
  const configured = Boolean(ga4 || ads);
  const panel = $('#consent-panel');
  const consentKey = 'caglar-measurement-v1';
  let consent = '';
  try { consent = localStorage.getItem(consentKey) || ''; } catch (_) { /* Storage may be unavailable. */ }
  let loaded = false;
  let consentReturnFocus = null;
  const lastEvents = new Map();
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied'
  });
  function loadTracking() {
    if (loaded || !configured) return;
    loaded = true;
    window.gtag('js', new Date());
    if (ga4) window.gtag('config', ga4, { allow_google_signals: false, allow_ad_personalization_signals: false });
    if (ads) window.gtag('config', ads, { allow_ad_personalization_signals: false });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4 || ads);
    document.head.appendChild(script);
  }
  function applyConsent(value) {
    consent = value;
    const granted = value === 'granted';
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: 'denied'
    });
    if (granted) loadTracking();
  }
  if (configured) {
    document.querySelectorAll('[data-consent-settings]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        consentReturnFocus = button;
        if (panel) { panel.hidden = false; $('[data-consent="granted"]', panel)?.focus(); }
      });
    });
    if (consent === 'granted' || consent === 'denied') applyConsent(consent);
    else if (panel) panel.hidden = false;
  }
  document.querySelectorAll('[data-consent]').forEach(button => button.addEventListener('click', () => {
    applyConsent(button.dataset.consent);
    try { localStorage.setItem(consentKey, consent); } catch (_) { /* Choice remains in memory. */ }
    if (panel) panel.hidden = true;
    consentReturnFocus?.focus();
  }));
  function track(name, location, method) {
    if (!configured || consent !== 'granted') return;
    const now = Date.now();
    if (lastEvents.has(name) && now - lastEvents.get(name) < 800) return;
    lastEvents.set(name, now);
    const parameters = {
      service_name: document.body.dataset.service || 'Genel lojistik',
      link_location: location || 'content',
      contact_method: method || name,
      transport_type: 'beacon'
    };
    // Personal form fields and WhatsApp message contents are never sent to analytics.
    if (ga4) window.gtag('event', name, { ...parameters, send_to: ga4 });
    const label = name === 'phone_click' ? config.phoneClickLabel : name === 'whatsapp_click' ? config.whatsappClickLabel : '';
    if (ads && /^[A-Za-z0-9_-]+$/.test(label || '')) {
      window.gtag('event', 'conversion', { ...parameters, send_to: ads + '/' + label });
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    const location = link.dataset.location || 'content';
    if (href.startsWith('tel:')) track('phone_click', location, 'phone');
    else if (href.startsWith('https://wa.me/')) track('whatsapp_click', location, 'direct_link');
  });

  document.querySelectorAll('.quote-form').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const text = name => String(data.get(name) || '').trim();
      const date = text('date');
      const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('.') : 'Görüşerek belirlemek istiyorum';
      const message = [
        'Merhaba Çağlar Lojistik, taşıma teklifi almak istiyorum.',
        'Hizmet: ' + text('service'),
        text('name') ? 'Adım: ' + text('name') : '',
        'Çıkış: ' + text('pickup'),
        'Varış: ' + text('destination'),
        'Tarih: ' + displayDate,
        'Yük / eşya ve kat bilgileri: ' + text('details')
      ].filter(Boolean).join('\n');
      const destination = 'https://wa.me/905531640660?text=' + encodeURIComponent(message);
      track('quote_request', 'quote_form', 'whatsapp_form');
      track('whatsapp_click', 'quote_form', 'quote_form');
      // Navigate in the current tab: works on mobile and does not depend on popup permissions.
      window.location.assign(destination);
    });
  });

  const videoButton = $('[data-video-toggle]');
  const video = $('.hero-video');
  if (videoButton && video) videoButton.addEventListener('click', async () => {
    if (!video.paused) {
      video.pause();
      videoButton.setAttribute('aria-pressed', 'false');
      $('.video-label', videoButton).textContent = 'Tanıtım videosunu oynat';
      return;
    }
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    video.hidden = false;
    try {
      await video.play();
      videoButton.setAttribute('aria-pressed', 'true');
      $('.video-label', videoButton).textContent = 'Videoyu duraklat';
    } catch (_) {
      video.hidden = true;
      $('.video-label', videoButton).textContent = 'Videoyu yeniden dene';
    }
  });
})();
