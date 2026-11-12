/* ==========================================================
   MENÚ DE MUNDO ALITAS
   Edita aquí productos, descripciones y precios (en pesos).
   Estos son datos de EJEMPLO mientras confirmas el menú real.
========================================================== */
(() => {
  'use strict';

  const MA = window.MA;
  const tabsEl = document.getElementById('menuTabs');
  const panelsEl = document.getElementById('menuPanels');
  if (!MA || !tabsEl || !panelsEl) return;

  /* Sabores disponibles: al elegirlos cambia la foto de la tarjeta */
  const FLAVORS = [
    { name: 'BBQ clásica',     img: 'assets/flavor-bbq.jpg',    pos: '50% 38%' },
    { name: 'Picante furiosa', img: 'assets/flavor-hot.jpg',    pos: '45% 45%' },
    { name: 'Mango honey',     img: 'assets/flavor-mango.jpg',  pos: '50% 35%' },
    { name: 'BBQ coreana',     img: 'assets/flavor-korean.jpg', pos: '50% 55%' }
  ];

  /*  flavors: true      → muestra los chips de sabor
      swap: true         → la foto cambia con el sabor
      img / pos          → foto fija (si no hay, se usa el emoji "icon")
      price (número)     → precio en COP; priceNote = texto pequeño bajo el precio  */
  const MENU = [
    {
      id: 'combos', label: 'Combos',
      items: [
        { name: 'Combo Crunch Personal', desc: '4 alitas super crunch, 2 salsas de la casa, papitas, salsa de maíz y agua saborizada.', price: 43900, badge: 'Favorito', icon: '🍗' },
        { name: 'Combo Crunch 1 a 2 personas', desc: '8 alitas super crunch, 2 salsas de la casa, papitas y salsa de maíz.', price: 53900, icon: '🍗' },
        { name: 'Combo Crunch 2 a 3 personas', desc: '12 alitas super crunch, 3 salsas de la casa, papitas y salsa de maíz.', price: 66900, icon: '🍗' },
        { name: 'Combo Crunch 3 a 4 personas', desc: '18 alitas super crunch, 4 salsas de la casa, papitas y salsa de maíz.', price: 79900, badge: 'Más vendido', icon: '🍗' },
        { name: 'Combo Crunch 5 a 6 personas', desc: '25 alitas crunch, 4 salsas de la casa, papitas y salsa de maíz.', price: 110900, icon: '🍗' },
        { name: 'Combo Crunch Extra Familiar y Amigos', desc: 'Para 10 personas: 50 alitas crunch, 8 salsas de la casa, papitas extra grandes y salsa de maíz.', price: 220900, icon: '🍗' },
        { name: 'Combo Tradicional', desc: '8 alitas tradicionales, papitas, 2 salsas de la casa y salsa de maíz.', price: 43900, icon: '🍗' },
        { name: 'Crispetas de pollo', desc: 'Con 1 salsa de tu preferencia.', price: 30900, icon: '🍿' }
      ]
    },
    {
      id: 'alitas', label: 'Alitas',
      items: [
        { name: 'Alitas tradicionales', desc: 'Por unidad. Elige tu salsa de la casa.', price: 4100, priceNote: 'por unidad', icon: '🍗' },
        { name: 'Alitas super crunch', desc: 'Por unidad. Extra crocantes, con la salsa que elijas.', price: 5200, priceNote: 'por unidad', icon: '🍗' }
      ]
    },
    {
      id: 'burger', label: 'Burger del Rey',
      items: [
        { name: 'Mini Burger del Rey', desc: '3 mini burger, papitas, gaseosa, salsa de maíz y 1 salsa de la casa.', price: 31900, icon: '🍔' },
        { name: 'Combo Compartir Burger del Rey', desc: '6 mini burger y 2 salsas de la casa.', price: 35900, icon: '🍔' },
        { name: 'Tenders', desc: '5 trozos de pechuga apanado super crunch, papitas, salsa de la casa y salsa de maíz.', price: 35900, icon: '🍗' },
        { name: 'Cajita Sorpresa', desc: 'Juguete sorpresa, 1 alita crunch, papitas, crispetas de pollo, salsa de maíz, salsa de la casa y bebida.', price: 35900, icon: '🎁' }
      ]
    },
    {
      id: 'adicionales', label: 'Adicionales',
      items: [
        { name: 'Papitas personales', desc: 'Porción personal, doradas y calientes.', price: 9900, icon: '🍟' },
        { name: 'Papas súper', desc: 'Porción grande para compartir.', price: 14900, icon: '🍟' },
        { name: 'Salsa de maíz adicional', desc: 'Para acompañar tus papitas y alitas.', price: 2500, icon: '🌽' },
        { name: 'Salsa BBQ', desc: 'Salsa de la casa adicional.', price: 2000, icon: '🥫' },
        { name: 'Salsa miel mostaza', desc: 'Salsa de la casa adicional.', price: 2000, icon: '🍯' },
        { name: 'Salsa mostajita', desc: 'Salsa de la casa adicional.', price: 2000, icon: '🥫' },
        { name: 'Salsa BBQ picante', desc: 'Picante nivel 1 de 5.', price: 2500, icon: '🔥' },
        { name: 'Salsa chili mostaza', desc: 'Picante nivel 1 de 5.', price: 2500, icon: '🔥' },
        { name: 'Salsa chili dulce', desc: 'Picante nivel 2 de 5.', price: 2500, icon: '🔥' },
        { name: 'Salsa Inferno', desc: 'Picante nivel 5 de 5. Solo para valientes.', price: 2500, icon: '🌶️' }
      ]
    },
    {
      id: 'bebidas', label: 'Bebidas',
      items: [
        { name: 'Sodas refrescantes', desc: 'Con fruta, combinación de sabores única y refrescante (frutos rojos, maracuyá).', price: 19900, icon: '🥤' },
        { name: 'Limonada cerezada', desc: 'Fría y con cereza.', price: 15900, icon: '🍒' },
        { name: 'Limonada de coco', desc: 'Cremosa y refrescante.', price: 19900, icon: '🥥' },
        { name: 'Limonada de mango biche de la casa', desc: 'La receta de la casa.', price: 15900, icon: '🍋' },
        { name: 'Jugo en agua', desc: 'Jugo natural en agua.', price: 10900, icon: '🍹' },
        { name: 'Jugo en leche', desc: 'Jugo natural en leche.', price: 12900, icon: '🍹' },
        { name: 'Gaseosa personal', desc: 'Bien fría.', price: 5900, icon: '🥤' },
        { name: 'Gaseosa familiar', desc: 'Para compartir en la mesa.', price: 10900, icon: '🥤' },
        { name: 'Jugo Hit 350 ml', desc: 'Botella personal.', price: 5900, icon: '🧃' },
        { name: 'Jugo Hit 500 ml', desc: 'Botella grande.', price: 6900, icon: '🧃' },
        { name: 'Jugo Hit en caja', desc: 'Caja para compartir.', price: 10900, icon: '🧃' },
        { name: 'Aguas saborizadas', desc: 'Frías y livianas.', price: 7900, icon: '💧' },
        { name: 'Agua con gas', desc: 'Bien fría.', price: 6900, icon: '💧' },
        { name: 'Cerveza Poker', desc: 'Bien fría.', price: 7900, icon: '🍺' },
        { name: 'Cerveza Light', desc: 'Bien fría.', price: 7900, icon: '🍺' },
        { name: 'Refajo Colombiana', desc: 'El clásico para acompañar las alitas.', price: 5900, icon: '🍻' },
        { name: 'Soda michelada', desc: 'Refrescante y con limón.', price: 9900, icon: '🍋' },
        { name: 'Michelada tamarindo', desc: 'Con el toque dulce y ácido del tamarindo.', price: 10900, icon: '🍹' }
      ]
    }
  ];

  const money = n => '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const buildCard = (item, index) => {
    const card = el('article', 'menu-card');
    card.style.setProperty('--i', index);

    /* foto o emoji */
    const media = el('div', 'menu-media');
    let img = null;

    if (item.swap) {
      img = el('img');
      img.src = FLAVORS[0].img;
      img.style.objectPosition = FLAVORS[0].pos;
      img.alt = item.name;
      img.loading = 'lazy';
      media.appendChild(img);
    } else if (item.img) {
      img = el('img');
      img.src = item.img;
      img.style.objectPosition = item.pos || '50% 50%';
      img.alt = item.name;
      img.loading = 'lazy';
      media.appendChild(img);
    } else {
      media.appendChild(el('span', 'menu-tile', item.icon || '🍗'));
    }

    if (item.badge) media.appendChild(el('span', 'menu-badge', item.badge));
    card.appendChild(media);

    /* cuerpo */
    const body = el('div', 'menu-body');
    body.appendChild(el('h3', '', item.name));
    body.appendChild(el('p', '', item.desc));

    let flavor = item.flavors ? FLAVORS[0].name : '';
    const order = el('a', 'btn btn-dark btn-small', 'Pedir');
    order.target = '_blank';
    order.rel = 'noopener';

    const updateLink = () => {
      const detail = flavor ? ` — sabor ${flavor}` : '';
      order.href = MA.waLink(`Hola Mundo Alitas 👋 Quiero pedir: ${item.name}${detail}.`);
    };

    if (item.flavors) {
      const chips = el('div', 'chips');
      chips.setAttribute('role', 'group');
      chips.setAttribute('aria-label', 'Sabor');

      FLAVORS.forEach((f, i) => {
        const chip = el('button', 'chip', f.name);
        chip.type = 'button';
        chip.setAttribute('aria-pressed', String(i === 0));
        chip.addEventListener('click', () => {
          flavor = f.name;
          [...chips.children].forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
          if (item.swap && img) {
            img.src = f.img;
            img.style.objectPosition = f.pos;
          }
          updateLink();
        });
        chips.appendChild(chip);
      });

      body.appendChild(chips);
    }

    const foot = el('div', 'menu-foot');
    const price = el('div', 'menu-price', money(item.price));
    if (item.priceNote) price.appendChild(el('small', '', item.priceNote));
    foot.append(price, order);
    body.appendChild(foot);
    card.appendChild(body);

    updateLink();
    return card;
  };

  MENU.forEach((category, i) => {
    const tab = el('button', 'tab-btn', category.label);
    tab.type = 'button';
    tab.id = `tab-${category.id}`;
    tab.setAttribute('role', 'tab');
    tab.dataset.tab = category.id;
    tab.setAttribute('aria-selected', String(i === 0));
    if (i !== 0) tab.tabIndex = -1;
    tabsEl.appendChild(tab);

    const panel = el('div', 'tab-panel');
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.dataset.panel = category.id;
    panel.hidden = i !== 0;

    const grid = el('div', 'menu-grid');
    category.items.forEach((item, n) => grid.appendChild(buildCard(item, n)));
    panel.appendChild(grid);
    panelsEl.appendChild(panel);
  });

  MA.initTabs(document.getElementById('menuTabsRoot'), true);
})();
