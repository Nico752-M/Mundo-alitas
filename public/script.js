(() => {
  'use strict';

  /* ==========================================================
     CONFIGURACIÓN — edita aquí los datos del negocio
  ========================================================== */
  const CONFIG = {
    whatsapp: '573147172603',                                   // +57 314 717 2603
    instagram: 'https://www.instagram.com/mundoalitascolombia',
    mapQuery: 'Cra. 28 #30-30, Tuluá, Valle del Cauca, Colombia',
    promoWeekday: 'Thursday',                                   // día de la promo
    timeZone: 'America/Bogota'
  };

  const waLink = message =>
    `https://wa.me/${CONFIG.whatsapp}` +
    (message ? `?text=${encodeURIComponent(message)}` : '');

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const root = document.documentElement;
  const header = $('.header');
  const toggle = $('.mobile-toggle');
  const loader = $('.preloader');
  const isInner = document.body.classList.contains('page-inner');
  const skipIntro = root.classList.contains('skip-intro');

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* ==========================================================
     PESTAÑAS (menú y ubicación): cambian el contenido sin scroll
  ========================================================== */
  const initTabs = (container, useHash = false) => {
    if (!container) return;

    const buttons = $$('[role="tab"]', container);
    const panels = $$('[role="tabpanel"]', container);
    if (!buttons.length) return;

    const select = (id, { focus = false, center = false } = {}) => {
      buttons.forEach(button => {
        const on = button.dataset.tab === id;
        button.setAttribute('aria-selected', String(on));
        button.tabIndex = on ? 0 : -1;

        if (on && focus) button.focus();
        if (on && center) {
          button.scrollIntoView({ inline: 'center', block: 'nearest' });
        }
      });

      panels.forEach(panel => {
        panel.hidden = panel.dataset.panel !== id;
      });

      if (useHash) {
        try { history.replaceState(null, '', `#${id}`); } catch (e) { /* noop */ }
      }
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => select(button.dataset.tab));

      button.addEventListener('keydown', event => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();

        const step = event.key === 'ArrowRight' ? 1 : -1;
        const next = buttons[(index + step + buttons.length) % buttons.length];
        select(next.dataset.tab, { focus: true, center: true });
      });
    });

    const fromHash = useHash ? location.hash.replace('#', '') : '';
    const exists = buttons.some(button => button.dataset.tab === fromHash);

    if (exists) {
      select(fromHash, { center: true });
    } else {
      select(buttons.find(b => b.getAttribute('aria-selected') === 'true')?.dataset.tab
        || buttons[0].dataset.tab);
      if (useHash) {
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* noop */ }
      }
    }

    if (useHash) {
      window.addEventListener('hashchange', () => {
        const id = location.hash.replace('#', '');
        if (buttons.some(button => button.dataset.tab === id)) select(id, { center: true });
      });
    }
  };

  window.MA = { CONFIG, waLink, initTabs };

  /* ENLACES DE WHATSAPP, INSTAGRAM Y MAPA (un solo lugar para cambiarlos) */
  $$('[data-wa]').forEach(link => {
    link.href = waLink(link.dataset.wa);
    link.target = '_blank';
    link.rel = 'noopener';
  });

  $$('[data-ig]').forEach(link => {
    link.href = CONFIG.instagram;
    link.target = '_blank';
    link.rel = 'noopener';
  });

  $$('[data-map]').forEach(link => {
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapQuery)}`;
    link.target = '_blank';
    link.rel = 'noopener';
  });

  /* PROMO DE JUEVES: avisa cuando "hoy es jueves" */
  try {
    const today = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: CONFIG.timeZone
    }).format(new Date());

    root.classList.toggle('is-promo-day', today === CONFIG.promoWeekday);
  } catch (e) { /* noop */ }

  /* AÑO AUTOMÁTICO */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* CABECERA DINÁMICA */
  /* Distancia de cada botón hasta el logo: así se enrollan hacia él y vuelven a su sitio */
  const measureHeader = () => {
    if (!header) return;

    const center = header.clientWidth / 2;
    const items = [...$$('.nav a', header), ...(toggle ? [toggle] : [])]
      .filter(el => el.offsetParent === header)
      .map(el => ({ el, pull: center - (el.offsetLeft + el.offsetWidth / 2) }))
      .sort((a, b) => Math.abs(a.pull) - Math.abs(b.pull));

    items.forEach(({ el, pull }, rank) => {
      el.style.setProperty('--pull', `${Math.round(pull)}px`);
      el.style.setProperty('--d-show', `${rank * 55}ms`);                  /* salen primero los más cercanos al logo */
      el.style.setProperty('--d-hide', `${(items.length - 1 - rank) * 25}ms`); /* se recogen primero los más lejanos */
    });
  };

  measureHeader();
  window.addEventListener('resize', measureHeader);
  window.addEventListener('load', measureHeader);
  document.fonts?.ready.then(measureHeader);

  /* Barra retráctil: se recoge al bajar y sale de golpe (como un yoyo) al subir */
  let lastY = window.scrollY;
  let travelled = 0;

  const updateHeader = () => {
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    lastY = y;

    header?.classList.toggle('is-scrolled', isInner || y > 35);

    if (!header) return;

    const menuOpen = header.classList.contains('menu-open');

    if (y < 90 || menuOpen) {
      header.classList.remove('is-hidden');
      travelled = 0;
      return;
    }

    /* acumula el recorrido en una misma dirección para no reaccionar a temblores del scroll */
    travelled = (Math.sign(delta) === Math.sign(travelled)) ? travelled + delta : delta;

    if (travelled > 14) header.classList.add('is-hidden');
    else if (travelled < -14) header.classList.remove('is-hidden');
  };

  updateHeader();

  window.addEventListener('scroll', updateHeader, { passive: true });
  header?.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* MENÚ MÓVIL */
  const closeMenu = () => {
    header?.classList.remove('menu-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Abrir navegación');
  };

  toggle?.addEventListener('click', () => {
    const opened = header.classList.toggle('menu-open');

    toggle.setAttribute('aria-expanded', String(opened));
    toggle.setAttribute('aria-label', opened ? 'Cerrar navegación' : 'Abrir navegación');
  });

  $$('.nav a').forEach(link => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', event => {
    if (header?.classList.contains('menu-open') && !header.contains(event.target)) {
      closeMenu();
    }
  });

  /* GALERÍAS EN CELULAR: carrusel automático (se detiene al tocar y se puede deslizar) */
  (() => {
    if (reduceMotion) return;
    const mobile = window.matchMedia('(max-width: 700px)');

    $$('.lugar-gallery').forEach(gallery => {
      let pressed = false;
      let visible = false;
      let resumeAt = 0;

      const press = () => { pressed = true; };
      const release = () => { pressed = false; resumeAt = Date.now() + 5000; };

      gallery.addEventListener('touchstart', press, { passive: true });
      gallery.addEventListener('touchend', release, { passive: true });
      gallery.addEventListener('touchcancel', release, { passive: true });
      gallery.addEventListener('mousedown', press);
      gallery.addEventListener('mouseup', release);

      const step = () => {
        if (!mobile.matches || pressed || !visible || document.hidden) return;
        if (Date.now() < resumeAt || gallery.offsetParent === null) return;
        if (gallery.scrollWidth <= gallery.clientWidth + 4) return;

        const first = gallery.firstElementChild;
        const gap = parseFloat(getComputedStyle(gallery).columnGap) || 10;
        const atEnd = gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 4;

        gallery.scrollTo({
          left: atEnd ? 0 : gallery.scrollLeft + first.getBoundingClientRect().width + gap,
          behavior: 'smooth'
        });
      };

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          visible = entries[0].isIntersecting;
        }, { threshold: .4 }).observe(gallery);
      } else {
        visible = true;
      }

      /* reemplazado por el flujo continuo de abajo */
    });
  })();

  /* GALERÍAS EN CELULAR: flujo continuo (se detiene al tocar y se puede deslizar) */
  (() => {
    if (reduceMotion) return;
    const mobile = window.matchMedia('(max-width: 620px)');
    const SPEED = 36; /* píxeles por segundo */

    const items = $$('.lugar-gallery').map(gallery => {
      /* copia de las fotos al final para que el giro nunca tenga corte */
      const clones = [...gallery.children].map(figure => {
        const clone = figure.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.hidden = true;
        gallery.appendChild(clone);
        return clone;
      });

      const state = { gallery, clones, pos: 0, loop: 0, pressed: false, resumeAt: 0, visible: false };
      const press = () => { state.pressed = true; };
      const release = () => { state.pressed = false; state.resumeAt = performance.now() + 1800; };

      gallery.addEventListener('touchstart', press, { passive: true });
      gallery.addEventListener('touchend', release, { passive: true });
      gallery.addEventListener('touchcancel', release, { passive: true });
      gallery.addEventListener('mousedown', press);
      gallery.addEventListener('mouseup', release);

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          state.visible = entries[0].isIntersecting;
        }, { threshold: .2 }).observe(gallery);
      } else {
        state.visible = true;
      }

      return state;
    });

    const sync = () => items.forEach(s => {
      s.clones.forEach(c => { c.hidden = !mobile.matches; });
      s.loop = 0;
    });

    sync();
    mobile.addEventListener?.('change', sync);
    window.addEventListener('resize', () => items.forEach(s => { s.loop = 0; }));

    let last = performance.now();

    const frame = now => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;

      if (mobile.matches && !document.hidden) {
        items.forEach(s => {
          const g = s.gallery;
          if (!s.visible || g.offsetParent === null) return;

          if (!s.loop) s.loop = s.clones[0].offsetLeft - g.firstElementChild.offsetLeft;
          if (s.loop <= 0) return;

          if (s.pressed || now < s.resumeAt) {
            /* la persona lo mueve: seguimos su posición sin pelear con el dedo */
            s.pos = g.scrollLeft;
            if (s.pos >= s.loop) { s.pos -= s.loop; g.scrollLeft = s.pos; }
          } else {
            s.pos += SPEED * dt;
            if (s.pos >= s.loop) s.pos -= s.loop;
            g.scrollLeft = s.pos;
          }
        });
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  })();

  /* TRANSICIÓN ENTRE PÁGINAS (cortina amarilla) */
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');

    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      link.target === '_blank' ||
      link.hasAttribute('download')
    ) return;

    const url = new URL(link.href, location.href);

    if (
      url.protocol !== location.protocol ||
      url.origin !== location.origin ||
      url.pathname === location.pathname
    ) return;

    event.preventDefault();
    root.classList.add('is-leaving');

    window.setTimeout(() => {
      location.href = link.href;
    }, reduceMotion ? 0 : 420);
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted) root.classList.remove('is-leaving');
  });

  /* HISTORIA: LAS PALABRAS SE ENCIENDEN AL HACER SCROLL */
  const statement = $('#statementText');
  let words = [];

  if (statement) {
    words = statement.textContent.trim().split(/\s+/).map(text => {
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = text;
      return span;
    });

    statement.textContent = '';

    words.forEach((word, index) => {
      statement.appendChild(word);
      if (index < words.length - 1) {
        statement.appendChild(document.createTextNode(' '));
      }
    });
  }

  const updateStatement = () => {
    if (!words.length) return;

    if (reduceMotion) {
      words.forEach(word => word.classList.remove('is-dim'));
      return;
    }

    const rect = statement.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0,
      (window.innerHeight * .8 - rect.top) / (window.innerHeight * .55)
    ));

    const lit = Math.round(words.length * (.38 + .62 * progress));

    words.forEach((word, index) => {
      word.classList.toggle('is-dim', index >= lit);
    });
  };

  updateStatement();

  window.addEventListener('scroll', updateStatement, { passive: true });
  window.addEventListener('resize', updateStatement);

  /* SABORES: CAMBIAR IMAGEN CON MOUSE, TOQUE O DESLIZAMIENTO */
  const stage = $('#flavorStage');
  const flavorRows = $$('.flavor-row');
  const shots = $$('.shot', stage || document);
  const dots = $$('.flavor-dots i', stage || document);
  let currentFlavor = -1;

  const setFlavor = index => {
    if (!stage || index === currentFlavor || index < 0 || index >= flavorRows.length) return;

    currentFlavor = index;
    const row = flavorRows[index];

    flavorRows.forEach((item, i) => item.classList.toggle('is-active', i === index));
    shots.forEach((shot, i) => shot.classList.toggle('is-active', i === index));
    dots.forEach((dot, i) => dot.classList.toggle('on', i === index));

    $('#fName').textContent = row.dataset.name;
    $('#fTag').textContent = row.dataset.tag;
    $('#fDesc').textContent = row.dataset.desc;

    stage.classList.remove('swap');
    void stage.offsetWidth;
    stage.classList.add('swap');
  };

  const touchOnly = window.matchMedia('(hover: none)').matches;

  flavorRows.forEach((row, index) => {
    row.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') setFlavor(index);
    });
    row.addEventListener('focus', () => setFlavor(index));
    row.addEventListener('click', event => {
      if (touchOnly) {
        event.preventDefault();
        setFlavor(index);
      }
    });
  });

  $('.flavor-rows')?.addEventListener('touchmove', event => {
    const touch = event.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = target?.closest('.flavor-row');
    if (row) setFlavor(Number(row.dataset.i));
  }, { passive: true });

  let swipeX = null;

  stage?.addEventListener('touchstart', event => {
    swipeX = event.touches[0].clientX;
  }, { passive: true });

  stage?.addEventListener('touchend', event => {
    if (swipeX === null) return;
    const dx = event.changedTouches[0].clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) < 40) return;
    const total = flavorRows.length;
    setFlavor((currentFlavor + (dx < 0 ? 1 : -1) + total) % total);
  }, { passive: true });

  setFlavor(0);

  /* FOTOS DEL LUGAR: CAMBIO AUTOMÁTICO SUAVE */
  $$('[data-slider]').forEach((box, n) => {
    const slides = $$('.slide', box);
    if (slides.length < 2 || reduceMotion) return;

    let current = 0;

    window.setInterval(() => {
      slides[current].classList.remove('is-on');
      current = (current + 1) % slides.length;
      slides[current].classList.add('is-on');
    }, 4800 + n * 900);
  });

  /* PESTAÑAS ESTÁTICAS (la página de menú inicia las suyas desde menu.js) */
  $$('[data-tabs]:not([data-hash])').forEach(container => initTabs(container));

  /* FRANJAS DE TEXTO: avanzan con el scroll y nunca se acaban (bucle infinito) */
  const tickers = $$('.ticker').map(ticker => {
    const track = $('.ticker-track', ticker);
    if (!track) return null;

    const base = [...track.children];
    const state = { ticker, track, base, unit: 0, current: 0 };

    state.build = () => {
      $$('[data-clone]', track).forEach(node => node.remove());
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      state.unit = track.scrollWidth + gap;
      if (!state.unit) return;

      const copies = Math.ceil(ticker.offsetWidth / state.unit) + 1;

      for (let c = 0; c < copies; c++) {
        base.forEach(node => {
          const clone = node.cloneNode(true);
          clone.dataset.clone = '';
          clone.setAttribute('aria-hidden', 'true');
          track.appendChild(clone);
        });
      }
    };

    state.build();
    return state;
  }).filter(Boolean);

  if (tickers.length) {
    const speed = .55;      // píxeles que avanza la franja por cada píxel de scroll
    let tickerRaf = 0;

    const paintTickers = () => {
      let moving = false;

      tickers.forEach(item => {
        if (!item.unit) return;
        const target = window.scrollY * speed;
        item.current += (target - item.current) * (reduceMotion ? 1 : .12);
        if (Math.abs(target - item.current) > .3) moving = true;
        else item.current = target;

        const x = -(item.current % item.unit);
        item.track.style.transform = `translate3d(${x}px,0,0)`;
      });

      tickerRaf = moving ? requestAnimationFrame(paintTickers) : 0;
    };

    const kickTickers = () => { if (!tickerRaf) tickerRaf = requestAnimationFrame(paintTickers); };

    window.addEventListener('scroll', kickTickers, { passive: true });
    window.addEventListener('resize', () => { tickers.forEach(item => item.build()); kickTickers(); });
    window.addEventListener('load', () => { tickers.forEach(item => item.build()); kickTickers(); });
    document.fonts?.ready.then(() => { tickers.forEach(item => item.build()); kickTickers(); });
    kickTickers();
  }

  /* BARRA DE PROGRESO DEL SCROLL */
  const progress = document.createElement('div');

  progress.className = 'ma-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  let progressPending = false;

  const updateProgress = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = total > 0 ? (window.scrollY / total) * 100 : 0;

    progress.style.width = `${Math.min(100, percentage)}%`;
    progressPending = false;
  };

  window.addEventListener('scroll', () => {
    if (progressPending) return;

    progressPending = true;
    requestAnimationFrame(updateProgress);
  }, { passive: true });

  updateProgress();

  /* HERO: LLUVIA DE ALITAS (se crea antes de comprobar GSAP para tener versión estática) */
  const canAnimate = !!(window.gsap && window.ScrollTrigger) && !reduceMotion;
  const rainWings = [];

  (() => {
    const back = $('.rain-back');
    const front = $('.rain-front');
    if (!back || !front) return;

    const small = window.innerWidth < 620;
    const scale = small ? .85 : Math.min(1.15, Math.max(.7, window.innerWidth / 1400));
    const rand = (min, max) => min + Math.random() * (max - min);
    const sources = ['assets/rain-wing-a.webp', 'assets/rain-wing-b.webp'];

    const make = (layer, count, minW, maxW, isFront) => {
      for (let i = 0; i < count; i++) {
        const wing = document.createElement('span');
        const img = document.createElement('img');
        wing.className = 'rain-wing';
        img.src = sources[(i + (isFront ? 1 : 0)) % sources.length];
        img.alt = '';
        img.decoding = 'async';
        wing.style.width = `${Math.round(rand(minW, maxW) * scale)}px`;
        wing.style.left = `${((i + rand(.05, .95)) / count) * 100 - 4}%`;
        if (!canAnimate) {
          wing.style.top = `${rand(4, 78)}%`;
          wing.style.transform = `rotate(${rand(-22, 22)}deg)`;
        }
        wing.appendChild(img);
        layer.appendChild(wing);
        rainWings.push({ wing, img, isFront });
      }
    };

    make(back, small ? 8 : 8, 60, 110, false);
    make(front, small ? 5 : 7, 110, 210, true);
  })();

  /* PRELOADER: solo la primera vez que se entra al sitio en cada sesión */
  if (loader) {
    try { sessionStorage.setItem('ma-intro', '1'); } catch (e) { /* noop */ }
    if (skipIntro) loader.remove();
  }

  let loaderFinished = false;

  const removeLoader = () => {
    if (loaderFinished) return;

    loaderFinished = true;

    if (!loader || !loader.isConnected) return;

    if (window.gsap && !reduceMotion) {
      window.gsap.to(loader, {
        yPercent: -105,
        duration: .8,
        ease: 'power4.inOut',
        onComplete: () => loader.remove()
      });
    } else {
      loader.remove();
    }
  };

  const loaderTimeout = window.setTimeout(removeLoader, 4800);

  /* SIN GSAP: LA PÁGINA SIGUE FUNCIONANDO */
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    window.clearTimeout(loaderTimeout);
    window.setTimeout(removeLoader, 200);
    return;
  }

  /* SISTEMA DE ANIMACIÓN */
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });

  /* ENTRADA DE LA CABECERA Y DE LAS PÁGINAS INTERNAS */
  const playHeader = (timeline) =>
    timeline.from(
      '.header .nav-a a, .header .nav-b a, .brand',
      { y: -20, autoAlpha: 0, duration: .65, stagger: .09, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }
    );

  const playHero = () => {
    const intro = gsap.timeline();

    playHeader(intro);

    intro.from('.hero-title .line-one',
      { yPercent: 70, autoAlpha: 0, duration: 1.05, ease: 'power4.out' }, '-=.25');

    intro.from('.hero-title .line-two',
      { yPercent: 70, autoAlpha: 0, duration: 1.05, ease: 'power4.out' }, '-=.72');

    intro.from('.wing-rain',
      { autoAlpha: 0, duration: 1.4, ease: 'power2.out' }, '-=.7');

    intro.from('.hero-kickers span',
      { y: 25, autoAlpha: 0, duration: .65, stagger: .15, ease: 'power3.out' }, '-=.6');

    intro.from('.hero-bottom .button',
      { y: 25, autoAlpha: 0, duration: .65, ease: 'power3.out' }, '-=.35');
  };

  const playInner = () => {
    const intro = gsap.timeline({ delay: .35 });

    playHeader(intro);

    intro.from(
      '.page-head .eyebrow, .loc-info > *',
      { y: 22, autoAlpha: 0, duration: .6, stagger: .08, ease: 'power3.out' }, '-=.3'
    );

    intro.from(
      '.promo-card, .tabs, .loc-stage',
      { y: 26, autoAlpha: 0, duration: .7, stagger: .1, ease: 'power3.out', clearProps: 'transform' }, '-=.4'
    );
  };

  const startPage = (delay = 0) => {
    if (isInner) {
      playInner();
    } else if ($('.hero')) {
      gsap.delayedCall(delay, playHero);
    }
  };

  /* INTRO DEL PRELOADER: LA MANO DE ADÁN Y LA ALITA SE ACERCAN */
  if (loader && loader.isConnected) {
    const counter = { value: 0 };
    const loadNumber = $('.load-number');
    const loadBar = $('.preloader-track span');

    const creation = gsap.timeline({ delay: .1 });

    creation
      .fromTo('.intro-hand',
        { xPercent: -75, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: 1.7, ease: 'power3.out' }, 0)
      .fromTo('.intro-wing',
        { xPercent: 75, yPercent: 6, rotation: 8, autoAlpha: 0, transformOrigin: '50% 60%' },
        { xPercent: 0, yPercent: 0, rotation: 0, autoAlpha: 1, duration: 1.8, ease: 'power3.out' }, .15)
      .to('.intro-hand', { xPercent: 2.5, duration: .55, ease: 'sine.inOut' }, '>-.1')
      .to('.intro-wing', { xPercent: -2.5, duration: .55, ease: 'sine.inOut' }, '<')
      .fromTo('.intro-spark',
        { scale: 0, autoAlpha: 0 },
        { scale: 1.6, autoAlpha: 1, duration: .28, ease: 'power2.out' }, '>-.05')
      .to('.intro-spark', { scale: 2.4, autoAlpha: 0, duration: .45, ease: 'power2.in' });

    gsap.to(counter, {
      value: 100,
      duration: 2.7,
      delay: .1,
      ease: 'power2.inOut',

      onUpdate: () => {
        const number = Math.round(counter.value).toString().padStart(2, '0');

        if (loadNumber) loadNumber.textContent = `${number}%`;
        if (loadBar) loadBar.style.width = `${counter.value}%`;
      },

      onComplete: () => {
        window.clearTimeout(loaderTimeout);

        gsap.to(loader, {
          yPercent: -105,
          duration: .8,
          delay: .2,
          ease: 'power4.inOut',

          onComplete: () => {
            loader.remove();
            loaderFinished = true;
            startPage();
          }
        });
      }
    });
  } else {
    window.clearTimeout(loaderTimeout);
    startPage(.4);
  }

  /* TITULARES: CADA PALABRA SUBE DESDE UNA MÁSCARA */
  const splitWords = element => {
    const text = element.textContent.trim();
    element.textContent = '';
    element.setAttribute('aria-label', text);

    return text.split(/\s+/).map((word, index, list) => {
      const mask = document.createElement('span');
      const inner = document.createElement('span');
      mask.className = 'mask';
      inner.className = 'in';
      inner.textContent = word;
      mask.appendChild(inner);
      element.appendChild(mask);
      if (index < list.length - 1) element.appendChild(document.createTextNode(' '));
      return inner;
    });
  };

  ['.flavors-list h2', '.explore h2', '.order-copy h2', '.lugar-home-head h2', '.cta-band h2', '.page-head h1', '.loc-info h1', '.loc-info h2']
    .forEach(selector => {
      $$(selector).forEach(element => {
        const pieces = splitWords(element);
        const inView = element.getBoundingClientRect().top < window.innerHeight * .88;

        gsap.from(pieces, {
          yPercent: 115,
          duration: 1,
          stagger: .12,
          delay: inView && isInner ? .45 : 0,
          ease: 'power4.out',
          scrollTrigger: { trigger: element, start: 'top 88%', once: true }
        });
      });
    });

  /* PIE: "MUNDO ALITAS" LETRA POR LETRA */
  const wordmark = $('.footer-wordmark');

  if (wordmark) {
    const label = wordmark.textContent.trim();
    wordmark.textContent = '';
    wordmark.setAttribute('aria-label', label);

    const letters = [...label].map(char => {
      const mask = document.createElement('span');
      const inner = document.createElement('span');
      mask.className = 'mask';
      inner.className = 'in';
      inner.innerHTML = char === ' ' ? '&nbsp;' : char;
      mask.appendChild(inner);
      wordmark.appendChild(mask);
      return inner;
    });

    gsap.from(letters, {
      yPercent: 110,
      duration: .9,
      stagger: .045,
      ease: 'power4.out',
      scrollTrigger: { trigger: wordmark, start: 'top 92%', once: true }
    });
  }

  /* FOTOS: SE ABREN DESDE ABAJO Y HACEN ZOOM */
  const revealPhotos = (selector, trigger) => {
    const items = $$(selector);
    if (!items.length) return;

    gsap.fromTo(
      items,
      { clipPath: 'inset(100% 0 0 0)' },
      {
        clipPath: 'inset(0% 0 0 0)',
        duration: 1.15,
        stagger: .16,
        ease: 'power4.inOut',
        scrollTrigger: { trigger, start: 'top 82%', once: true }
      }
    );

    gsap.fromTo(
      items.map(item => item.querySelector('img, figcaption')).filter(Boolean),
      { scale: 1.18 },
      {
        scale: 1,
        duration: 1.6,
        stagger: .16,
        ease: 'power3.out',
        scrollTrigger: { trigger, start: 'top 82%', once: true }
      }
    );
  };

  revealPhotos('.plan-grid > *', '.plan-grid');
  revealPhotos('.explore-grid > *', '.explore-grid');
  revealPhotos('.order > .order-photo-food', '.order');
  revealPhotos('.lugar-mosaic > *', '.lugar-mosaic');

  /* SABORES: FILAS EN SECUENCIA */
  gsap.fromTo(
    '.flavor-rows li',
    { y: 28, autoAlpha: 0 },
    {
      y: 0, autoAlpha: 1, duration: .7, stagger: .12, ease: 'power3.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.flavor-rows', start: 'top 85%', once: true }
    }
  );

  /* EVENTOS: LOS TRES PUNTOS */
  gsap.fromTo(
    '.plan-points article',
    { y: 30, autoAlpha: 0 },
    {
      y: 0, autoAlpha: 1, duration: .7, stagger: .14, ease: 'power3.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.plan-points', start: 'top 88%', once: true }
    }
  );

  /* BANDAS: SE ABREN DESDE EL CENTRO */
  $$('.ticker').forEach(ticker => {
    gsap.fromTo(
      ticker,
      { clipPath: 'inset(0 50% 0 50%)' },
      {
        clipPath: 'inset(0 0% 0 0%)',
        duration: 1.1,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: ticker, start: 'top 92%', once: true }
      }
    );
  });

  /* HERO: LLUVIA DE ALITAS */
  const hero = $('.hero');

  if (hero && rainWings.length) {
    const rainTweens = [];
    const fall = Math.max(hero.offsetHeight, 760);

    rainWings.forEach(({ wing, img, isFront }) => {
      const size = wing.offsetWidth;
      const dur = isFront ? gsap.utils.random(6.5, 10) : gsap.utils.random(11, 16);

      gsap.set(wing, { y: -(size * 1.6) });

      const drop = gsap.to(wing, {
        y: fall + size * .6,
        duration: dur,
        ease: 'none',
        repeat: -1
      });
      drop.progress(Math.random());

      const tilt = gsap.utils.random(10, 26);
      const spin = gsap.fromTo(img,
        { rotation: -tilt },
        { rotation: tilt, duration: gsap.utils.random(2.6, 4.6), ease: 'sine.inOut', yoyo: true, repeat: -1 }
      );
      spin.progress(Math.random());

      const sway = gsap.to(img, {
        x: gsap.utils.random(18, 46) * (Math.random() < .5 ? -1 : 1),
        duration: gsap.utils.random(1.8, 3.2),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });

      rainTweens.push(drop, spin, sway);
    });

    /* Solo se anima mientras el hero se ve */
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top bottom',
      end: 'bottom top',
      onToggle: self => rainTweens.forEach(t => (self.isActive ? t.resume() : t.pause()))
    });

    if (window.matchMedia('(hover: hover)').matches) {
      const moveBack = gsap.quickTo('.rain-back', 'x', { duration: 1.2, ease: 'power3.out' });
      const moveFront = gsap.quickTo('.rain-front', 'x', { duration: .9, ease: 'power3.out' });
      const moveTitle = gsap.quickTo('.hero-title', 'x', { duration: 1.2, ease: 'power3.out' });

      hero.addEventListener('pointermove', event => {
        const px = event.clientX / window.innerWidth - .5;

        moveBack(px * -14);
        moveFront(px * 40);
        moveTitle(px * -18);
      });
    }

    gsap.to('.rain-front', {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
    });
  }

  /* REFRESCAR CÁLCULOS CUANDO CARGUEN LAS IMÁGENES */
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  }, { once: true });

  window.setTimeout(() => {
    ScrollTrigger.refresh();
  }, 700);

})();
