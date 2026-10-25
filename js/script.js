/* === JS/script.js === */

// 1. Función para cambiar de pestaña/sección (SPA)
function switchTab(targetId) {
  // Ocultar todas las secciones
  const sections = document.querySelectorAll('.app-section');
  sections.forEach(sec => sec.classList.remove('active-section'));

  // Desactivar todos los botones del menú
  const navItems = document.querySelectorAll('#main-nav .nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  // Mostrar la sección objetivo
  const targetSection = document.getElementById(`sec-${targetId}`);
  if (targetSection) {
    targetSection.classList.add('active-section');
  }

  // Activar el botón correspondiente en el menú
  const activeNavItem = document.querySelector(`#main-nav .nav-item[data-target="${targetId}"]`);
  if (activeNavItem) {
    activeNavItem.classList.add('active');
  }

  // Desplazar suavemente hacia arriba
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 2. Función para abrir/cerrar menú desplegable en móvil
function toggleMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.classList.toggle('nav-open');
  }
}

// 3. Modo claro / oscuro
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

    // Cambiar el favicon según el tema
  const favicon = document.getElementById('logo_pestaña');
  if (favicon) {
    favicon.setAttribute('href', theme === 'dark' ? 'img/logo.png' : 'img/logo-light.png');
  }

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const icon = btn.querySelector('i');
    const isDark = theme === 'dark';
    // En oscuro se muestra el sol (para pasar a claro) y viceversa
    icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('theme', next); } catch (e) {}
}

// 4. Inicialización de eventos al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
  // Sincronizar icono con el tema ya aplicado en <head>
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Asignar evento click a cada enlace de navegación
  const navItems = document.querySelectorAll('#main-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target) {
        switchTab(target);
      }

      // Cerrar el menú desplegable en móvil tras hacer clic
      const navLinks = document.querySelector('.nav-links');
      if (navLinks && navLinks.classList.contains('nav-open')) {
        navLinks.classList.remove('nav-open');
      }
    });
  });

  initComparisonSliders();
  onCalcDeviceChange();
  updateBrandsAndModels();

  // Cargar datos del formulario desde cookies si existen
  if (typeof loadFormCookies === 'function') {
    loadFormCookies();
  }
});

// 5. Slider comparador Antes / Después
function initComparisonSliders() {
  document.querySelectorAll('.img-comp-container').forEach(container => {
    const before = container.querySelector('.img-before');
    const handle = container.querySelector('.img-comp-slider-handle');
    let dragging = false;

    function setPosition(clientX) {
      const rect = container.getBoundingClientRect();
      let percent = ((clientX - rect.left) / rect.width) * 100;
      percent = Math.max(0, Math.min(100, percent));
      before.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
      handle.style.left = `${percent}%`;
    }

    container.addEventListener('pointerdown', e => {
      dragging = true;
      container.setPointerCapture(e.pointerId);
      setPosition(e.clientX);
    });

    container.addEventListener('pointermove', e => {
      if (dragging) setPosition(e.clientX);
    });

    const stop = () => { dragging = false; };
    container.addEventListener('pointerup', stop);
    container.addEventListener('pointercancel', stop);
  });
}

// 6. CALCULADORA DE PRESUPUESTOS
const CALC_REPAIRS = {
  movil: [
    { label: 'Cambio de pantalla',               labor: 20 },
    { label: 'Cambio de batería',                labor: 10 },
    { label: 'Puerto de carga',                  labor: 10 },
    { label: 'Cámara / sensores',                labor: 20 },
    { label: 'Carcasa / tapa trasera',           labor: 10 },
    { label: 'Diagnóstico (no sé qué le pasa)',  labor: 5 }
  ],
  tablet: [
    { label: 'Cambio de pantalla / cristal',     labor: 20 },
    { label: 'Cambio de batería',                labor: 10 },
    { label: 'Puerto de carga',                  labor: 10 },
    { label: 'Carcasa',                          labor: 20 },
    { label: 'Diagnóstico (no sé qué le pasa)',  labor: 5 }
  ],
  pc: [
    { label: 'Limpieza + pasta térmica',         labor: 15 },
    { label: 'Ampliar RAM / instalar SSD',       labor: 15 },
    { label: 'Formateo e instalación de Windows',labor: 20 },
    { label: 'Cambio de componente (fuente, gráfica...)', labor: 25 },
    { label: 'Diagnóstico (no sé qué le pasa)',  labor: 10 }
  ],
  portatil: [
    { label: 'Limpieza + pasta térmica',         labor: 15 },
    { label: 'Ampliar RAM / instalar SSD',       labor: 15 },
    { label: 'Cambio de pantalla',               labor: 20 },
    { label: 'Cambio de batería',                labor: 20 },
    { label: 'Formateo e instalación de Windows',labor: 20 },
    { label: 'Diagnóstico (no sé qué le pasa)',  labor: 10 }
  ],
  otro: [
    { label: 'Diagnóstico',                      labor: 10 },
    { label: 'Reparación sencilla',              labor: 20 },
    { label: 'Reparación avanzada',              labor: 40 }
  ]
};

const fmtEUR = n => n.toFixed(2) + ' €';

function getSelectedRepairs() {
  const device = document.getElementById('calc-device').value;
  return Array.from(document.querySelectorAll('#calc-repair-list input:checked'))
    .map(input => CALC_REPAIRS[device][Number(input.value)]);
}

function onCalcDeviceChange() {
  const device = document.getElementById('calc-device').value;
  const list = document.getElementById('calc-repair-list');
  list.innerHTML = '';

  CALC_REPAIRS[device].forEach((r, i) => {
    const label = document.createElement('label');
    label.className = 'radio-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = i;
    input.addEventListener('change', runCalculator);

    const span = document.createElement('span');
    span.textContent = r.label;

    label.append(input, span);
    list.appendChild(label);
  });

  document.getElementById('calc-otro-group').classList.toggle('is-hidden', device !== 'otro');
  runCalculator();
}

function runCalculator() {
  const range = document.getElementById('calc-piece-range');
  const source = document.querySelector('input[name="calc-piece-source"]:checked').value;
  const ownPiece = source === 'cliente';

  range.disabled = ownPiece;
  document.getElementById('calc-piece-val').textContent = range.value + ' €';

  const labor = getSelectedRepairs().reduce((sum, r) => sum + r.labor, 0);
  const piece = ownPiece ? 0 : Number(range.value);

  document.getElementById('rec-labor').textContent = fmtEUR(labor);
  document.getElementById('rec-piece').textContent = fmtEUR(piece);
  document.getElementById('rec-total').textContent = fmtEUR(labor + piece);
}

// 7. FORMULARIO: marcas según dispositivo
const BRANDS = {
  movil:    ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Motorola', 'Otra'],
  tablet:   ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Huawei', 'Otra'],
  pc:       ['Montado a piezas', 'HP', 'Dell', 'Lenovo', 'Asus', 'Otra'],
  portatil: ['Asus', 'HP', 'Lenovo', 'Acer', 'Dell', 'MSI', 'Apple', 'Otra']
};

function updateBrandsAndModels() {
  const tipo = document.getElementById('dev-tipo').value;
  const marca = document.getElementById('dev-marca');
  const esOtro = tipo === 'otro';

  document.getElementById('dev-marca-group').classList.toggle('is-hidden', esOtro);
  document.getElementById('dev-otro-group').classList.toggle('is-hidden', !esOtro);
  document.getElementById('dev-otro').required = esOtro;
  marca.required = !esOtro;
  marca.disabled = esOtro;

  marca.innerHTML = '';
  (BRANDS[tipo] || []).forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    marca.appendChild(opt);
  });
}

// 8. Botones que llevan al formulario
function preselectDevice(tipo) {
  document.getElementById('dev-tipo').value = tipo;
  updateBrandsAndModels();
  switchTab('contacto');
}

let calcBudget = null;

function transferCalcToForm() {
  const aceptado = confirm(
    'Aviso: este presupuesto es una estimación aproximada.\n\n' +
    'El precio final puede ser mayor o menor, y se confirmará tras revisar el dispositivo.\n\n' +
    '¿Quieres continuar con la solicitud?'
  );
  if (!aceptado) return;

  const device = document.getElementById('calc-device').value;
  const repairs = getSelectedRepairs();
  const ownPiece = document.querySelector('input[name="calc-piece-source"]:checked').value === 'cliente';

  const labor = repairs.reduce((sum, r) => sum + r.labor, 0);
  const piece = ownPiece ? 0 : Number(document.getElementById('calc-piece-range').value);

  calcBudget = {
    repairs: repairs.map(r => r.label),
    labor, piece,
    total: labor + piece,
    ownPiece
  };

  document.getElementById('dev-tipo').value = device;
  updateBrandsAndModels();
  if (device === 'otro') {
    document.getElementById('dev-otro').value = document.getElementById('calc-otro').value;
  }

  renderBudgetBox();
  switchTab('contacto');
}

function renderBudgetBox() {
  const box = document.getElementById('budget-box');
  if (!calcBudget) {
    box.classList.add('is-hidden');
    return;
  }
  const pieceText = calcBudget.ownPiece ? 'la aporta el cliente' : fmtEUR(calcBudget.piece);
  document.getElementById('budget-repairs').textContent =
    calcBudget.repairs.length ? calcBudget.repairs.join(', ') : 'Sin reparaciones marcadas';
  document.getElementById('budget-labor').textContent = fmtEUR(calcBudget.labor);
  document.getElementById('budget-piece').textContent = pieceText;
  document.getElementById('budget-total').textContent = fmtEUR(calcBudget.total);
  box.classList.remove('is-hidden');
}

function clearBudget() {
  calcBudget = null;
  renderBudgetBox();
}

// 9. FORMULARIO, TICKET Y COOKIES
const DEVICE_LABELS = {
  movil: 'Móvil / Smartphone',
  tablet: 'Tablet / iPad',
  pc: 'PC de sobremesa',
  portatil: 'Portátil',
  otro: 'Otro dispositivo'
};

function setCookie(name, value, days = 180) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.split('; ').find(c => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

function loadFormCookies() {
  document.getElementById('usr-nombre').value   = getCookie('usr_nombre');
  document.getElementById('usr-telefono').value = getCookie('usr_telefono');
  document.getElementById('usr-email').value    = getCookie('usr_email');
}

function copyTicketToClipboard() {
  const t = id => document.getElementById(id).textContent;
  let text =
    `TICKET ${t('ticket-id')}\n` +
    `Fecha: ${t('tkt-fecha')}\n` +
    `Cliente: ${t('tkt-nombre')}\n` +
    `Contacto: ${t('tkt-tel')} (${t('tkt-email')})\n` +
    `Dispositivo: ${t('tkt-dispositivo')}\n` +
    `Modelo: ${t('tkt-modelo')}\n` +
    `Avería: ${t('tkt-desc')}\n`;

  if (calcBudget) {
    text +=
      `\nPresupuesto estimado (aprox.):\n` +
      `Reparaciones: ${t('tkt-b-repairs')}\n` +
      `Mano de obra: ${t('tkt-b-labor')} | Pieza: ${t('tkt-b-piece')}\n` +
      `Total aprox.: ${t('tkt-b-total')}\n` +
      `* Precio aproximado, sujeto a revisión del dispositivo.`;
  }

  navigator.clipboard.writeText(text)
    .then(() => alert('Resumen copiado. Envíamelo para registrar tu solicitud.'))
    .catch(() => alert('No se pudo copiar automáticamente.'));
}

function closeTicket() {
  document.getElementById('ticket-modal').classList.add('hidden');
  document.getElementById('repair-form').reset();
  clearBudget();
  loadFormCookies();
  updateBrandsAndModels();
}

// 10. ENVÍO POR EMAIL (EmailJS) Y PDF
const EMAILJS_PUBLIC_KEY  = 'khmWuIpjUOs9c1Y3P';
const EMAILJS_SERVICE_ID  = 'service_wjhj3ng';
const EMAILJS_TEMPLATE_ID = 'template_cyzv9jd';

if (window.emailjs) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

let lastTicket = null;

async function handleFormSubmit(event) {
  event.preventDefault();

  const tipo = document.getElementById('dev-tipo').value;
  const now  = new Date();

  const ticket = {
    id:          '#TF-' + String(now.getTime()).slice(-6),
    fecha:       now.toLocaleDateString('es-ES'),
    nombre:      document.getElementById('usr-nombre').value.trim(),
    tel:         document.getElementById('usr-telefono').value.trim(),
    email:       document.getElementById('usr-email').value.trim(),
    modelo:      document.getElementById('dev-modelo').value.trim(),
    desc:        document.getElementById('dev-desc').value.trim(),
    dispositivo: tipo === 'otro'
      ? document.getElementById('dev-otro').value.trim()
      : `${DEVICE_LABELS[tipo]} - ${document.getElementById('dev-marca').value}`,
    budget: calcBudget ? { ...calcBudget } : null
  };

  const budgetText = ticket.budget
  ? `<b>Reparaciones:</b> ${ticket.budget.repairs.join(', ') || 'Sin marcar'}<br>` +
    `<b>Mano de obra:</b> ${fmtEUR(ticket.budget.labor)} | <b>Pieza:</b> ` +
    `${ticket.budget.ownPiece ? 'la aporta el cliente' : fmtEUR(ticket.budget.piece)}<br>` +
    `<b>Total aprox.:</b> ${fmtEUR(ticket.budget.total)}`
  : 'Sin presupuesto de calculadora';

  const btn = event.target.querySelector('.btn-submit');
  const btnHTML = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      ticket_id: ticket.id, fecha: ticket.fecha, nombre: ticket.nombre,
      telefono: ticket.tel, email: ticket.email,
      dispositivo: ticket.dispositivo, modelo: ticket.modelo,
      descripcion: ticket.desc, presupuesto: budgetText
    });
  } catch (err) {
    console.error(err);
    alert('No se pudo enviar la solicitud. Inténtalo de nuevo o escríbeme por correo.');
    btn.disabled = false;
    btn.innerHTML = btnHTML;
    return;
  }

  btn.disabled = false;
  btn.innerHTML = btnHTML;

  if (document.getElementById('save-cookies').checked) {
    setCookie('usr_nombre', ticket.nombre);
    setCookie('usr_telefono', ticket.tel);
    setCookie('usr_email', ticket.email);
  }

  lastTicket = ticket;
  fillTicket(ticket);
  document.getElementById('ticket-modal').classList.remove('hidden');
}

function fillTicket(t) {
  const set = (id, v) => document.getElementById(id).textContent = v;
  set('ticket-id', t.id);
  set('tkt-fecha', t.fecha);
  set('tkt-nombre', t.nombre);
  set('tkt-tel', t.tel);
  set('tkt-email', t.email);
  set('tkt-dispositivo', t.dispositivo);
  set('tkt-modelo', t.modelo);
  set('tkt-desc', t.desc);

  const block = document.getElementById('tkt-budget-block');
  if (t.budget) {
    set('tkt-b-repairs', t.budget.repairs.join(', ') || 'Sin reparaciones marcadas');
    set('tkt-b-labor', fmtEUR(t.budget.labor));
    set('tkt-b-piece', t.budget.ownPiece ? 'la aporta el cliente' : fmtEUR(t.budget.piece));
    set('tkt-b-total', fmtEUR(t.budget.total));
    block.classList.remove('is-hidden');
  } else {
    block.classList.add('is-hidden');
  }
}

function loadImageData(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve({ data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function downloadTicketPDF() {
  if (!lastTicket) return;
  const t = lastTicket;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 20;
  const eur = n => n.toFixed(2) + ' EUR';
  const logo = await loadImageData('img/logo.png');
  let y = 0;

  const BLUE = [39, 71, 119], LIGHT = [243, 243, 250], TEXT = [30, 30, 30], GREY = [110, 110, 110];

  // ---------- Cabecera ----------
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 42, 'F');

  // Franja con degradado azul -> lila
  const steps = 70;
  for (let i = 0; i < steps; i++) {
    const k = i / (steps - 1);
    doc.setFillColor(
      Math.round(116 + (232 - 116) * k),
      Math.round(154 + (181 - 154) * k),
      Math.round(230 + (239 - 230) * k)
    );
    doc.rect((W / steps) * i, 42, W / steps + 0.3, 2.5, 'F');
  }

  let textX = M;
  if (logo) {
    const lh = 24, lw = lh * (logo.w / logo.h);
    doc.addImage(logo.data, 'PNG', M, 9, lw, lh);
    textX = M + lw + 6;
  }

  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('TICKET DE REPARACIÓN', textX, 19);
  doc.setFontSize(12);
  doc.text(t.id, textX, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(214, 227, 255);
  doc.text(t.fecha, W - M, 28, { align: 'right' });

  y = 56;

  // ---------- Mensaje para el cliente ----------
  const nombre = (t.nombre || '').split(' ')[0];
  const msg = doc.splitTextToSize(
    `¡Gracias por confiar en mí, ${nombre}! He recibido tu solicitud y la revisaré lo antes posible. ` +
    `Te contactaré por correo o teléfono en un máximo de 24-48 h para confirmar los siguientes pasos.`,
    W - M * 2 - 10
  );
  const boxH = msg.length * 5.5 + 12;
  doc.setFillColor(253, 244, 255);
  doc.setDrawColor(232, 181, 239);
  doc.roundedRect(M, y, W - M * 2, boxH, 3, 3, 'FD');
  doc.setFillColor(123, 78, 132);
  doc.rect(M, y + 2, 1.5, boxH - 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(123, 78, 132);
  doc.text('Solicitud recibida', M + 6, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT);
  doc.text(msg, M + 6, y + 13);
  y += boxH + 10;

  // ---------- Utilidades ----------
  const ensure = h => {
    if (y + h > H - 25) { doc.addPage(); y = 25; }
  };

  const section = title => {
    ensure(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BLUE);
    doc.text(title.toUpperCase(), M, y);
    doc.setDrawColor(214, 227, 255);
    doc.setLineWidth(0.6);
    doc.line(M, y + 2.5, W - M, y + 2.5);
    y += 10;
  };

  let zebra = false;
  const row = (label, value, bold = false) => {
    const lines = doc.splitTextToSize(String(value || '-'), W - M * 2 - 48);
    const h = lines.length * 5.5 + 3;
    ensure(h);
    if (zebra) {
      doc.setFillColor(...LIGHT);
      doc.rect(M - 2, y - 5, W - M * 2 + 4, h, 'F');
    }
    zebra = !zebra;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...GREY);
    doc.text(label, M, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...TEXT);
    doc.text(lines, M + 42, y);
    y += h;
  };

  // ---------- Contenido ----------
  section('Datos del cliente'); zebra = false;
  row('Nombre', t.nombre, true);
  row('Teléfono', t.tel);
  row('Email', t.email);
  y += 6;

  section('Dispositivo'); zebra = false;
  row('Equipo', t.dispositivo, true);
  row('Modelo', t.modelo);
  row('Avería', t.desc);
  y += 6;

  if (t.budget) {
    section('Presupuesto estimado (aprox.)'); zebra = false;
    row('Reparaciones', t.budget.repairs.join(', ') || 'Sin marcar');
    row('Mano de obra', eur(t.budget.labor));
    row('Pieza', t.budget.ownPiece ? 'La aporta el cliente' : eur(t.budget.piece));

    // Total destacado
    ensure(16);
    y += 2;
    doc.setFillColor(...BLUE);
    doc.roundedRect(M - 2, y - 5, W - M * 2 + 4, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255);
    doc.text('TOTAL APROX.', M + 2, y + 2);
    doc.text(eur(t.budget.total), W - M - 2, y + 2, { align: 'right' });
    y += 12;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text('* Precio aproximado: el presupuesto final se confirma tras revisar el dispositivo.', M, y);
    y += 10;
  }

  // ---------- Próximos pasos ----------
  section('Próximos pasos'); zebra = false;
  const pasos = [
    'Reviso tu solicitud y me pongo en contacto contigo.',
    'Hago un diagnóstico previo y te explico el problema y las opciones.',
    'Reparo solo lo necesario y te aviso en cuanto esté listo.'
  ];
  pasos.forEach((p, i) => {
    ensure(10);
    doc.setFillColor(253, 215, 255);
    doc.circle(M + 3, y - 1.5, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(123, 78, 132);
    doc.text(String(i + 1), M + 3, y - 0.2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXT);
    doc.text(p, M + 10, y);
    y += 8;
  });

  // ---------- Pie en todas las páginas ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(214, 227, 255);
    doc.setLineWidth(0.4);
    doc.line(M, H - 20, W - M, H - 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    doc.text('Kristiyan Donchev · Servicio técnico', W / 2, H - 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY);
    doc.text(`reparacionesteccs@gmail.com · Guarda este ticket (${t.id}) para cualquier consulta`, W / 2, H - 9, { align: 'center' });
  }

  doc.save(`Ticket-${t.id.replace('#', '')}.pdf`);
}