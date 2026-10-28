/**
 * /api/auditar?dominio=tunegocio.pe
 * Función de Cloudflare Pages. Lee EN VIVO la portada, robots.txt, llms.txt y
 * sitemap.xml del dominio indicado y devuelve siete comprobaciones con puntaje
 * sobre 100: lo que un asistente de IA necesita para entender y citar un sitio.
 *
 * Solo lee páginas públicas, con un User-Agent identificado. No guarda datos:
 * el resultado se cachea 10 minutos por dominio para no golpear dos veces
 * al mismo sitio durante 3 minutos.
 */

const UA = 'Mozilla/5.0 (compatible; DesigniaAuditBot/1.0; +https://designia360.com/auditoria)';
const LIMITE = 600 * 1024;          // bytes que leemos como máximo por archivo
const TIEMPO = 9000;                // ms por petición
const BOTS_IA = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'OAI-SearchBot'];
const TIPOS_ENTIDAD = /^(Organization|LocalBusiness|ProfessionalService|Corporation|Brand|Person|Store|MedicalBusiness|Dentist|Physician|Restaurant|Hotel|LodgingBusiness|RealEstateAgent|LegalService|FinancialService|HomeAndConstructionBusiness|AutoDealer|AutoRepair|BeautySalon|HealthAndBeautyBusiness|EducationalOrganization|School|SportsActivityLocation|FoodEstablishment|TravelAgency|EntertainmentBusiness|ChildCare|Attorney|Notary|InsuranceAgency|AccountingService|Electrician|Plumber|GeneralContractor|VeterinaryCare|Pharmacy|Clinic|Hospital|Bakery|CafeOrCoffeeShop|BarOrPub|ClothingStore|Florist|FurnitureStore|JewelryStore|ShoeStore|GardenStore|HardwareStore|HobbyShop|PetStore|SportingGoodsStore|MobilePhoneStore|ComputerStore|ElectronicsStore|MusicStore|BookStore|GroceryStore|ConvenienceStore|DepartmentStore|WholesaleStore|OutletStore|Optician|DaySpa|HairSalon|NailSalon|TattooParlor|HealthClub|EmploymentAgency|AdvertisingAgency|NGO|GovernmentOrganization|Airline|Consortium|LibrarySystem|NewsMediaOrganization|PerformingGroup|Project|ResearchOrganization|SportsOrganization|WorkersUnion|.*(Business|Service|Organization|Store|Agency|Shop|Salon|Center|Centre|Company))$/;

export async function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const dominio = limpiarDominio(url.searchParams.get('dominio') || '');
  // ?lang=en devuelve los textos en inglés; cualquier otro valor deja el español intacto
  const en = url.searchParams.get('lang') === 'en';
  const L = (es, ing) => en ? ing : es;
  if (!dominio) {
    return json({ error: 'dominio_invalido', mensaje: L('Escribe un dominio válido, por ejemplo tunegocio.pe', 'Enter a valid domain, for example yourbusiness.com') }, 400);
  }

  const cache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;
  const clave = new Request('https://designia360.com/api/auditar?dominio=' + encodeURIComponent(dominio) + (en ? '&lang=en' : ''), { method: 'GET' });
  if (cache) {
    const guardado = await cache.match(clave);
    if (guardado) return guardado;
  }

  const t0 = Date.now();
  const home = await cargarHome(dominio);
  if (!home) {
    return json({
      error: 'sin_respuesta', dominio,
      mensaje: L('No pudimos leer ' + dominio + ': no responde, no existe o bloquea lecturas automáticas.',
        'We couldn\'t read ' + dominio + ': it isn\'t responding, doesn\'t exist or blocks automated reads.')
    }, 502);
  }

  const base = home.origen;
  const [robots, llms, sitemap] = await Promise.all([
    leer(base + 'robots.txt'),
    leer(base + 'llms.txt'),
    leer(base + 'sitemap.xml')
  ]);

  const checks = [];
  const html = home.html;

  // 1 · robots.txt existe
  const robotsOk = robots.ok && !esHTML(robots.tipo, robots.texto);
  const rb = robotsOk ? parseRobots(robots.texto) : null;
  checks.push(robotsOk
    ? check('robots', 'robots.txt', 'ok', 10, 10, L('Existe y se puede leer.', 'It exists and can be read.') + (rb.sitemaps.length ? L(' Declara tu sitemap.', ' It declares your sitemap.') : ''),
        L('Ya está: solo mantenlo cuando cambies rutas.', 'Done. Just keep it current when you change your URLs.'))
    : check('robots', 'robots.txt', 'aviso', 10, 4,
        L('No encontramos robots.txt. Sin él los bots entran igual, pero conviene declararlo y aprovechar para listar tu sitemap.',
          'We couldn\'t find a robots.txt. Bots get in without one, but it\'s worth having, and it\'s the place to list your sitemap.'),
        L('Crear /robots.txt con "User-agent: *", "Allow: /" y la línea "Sitemap:" apuntando a tu sitemap.xml.',
          'Create /robots.txt with "User-agent: *", "Allow: /" and a "Sitemap:" line pointing to your sitemap.xml.')));

  // 2 · bots de IA permitidos
  if (robotsOk) {
    const bloqueados = BOTS_IA.filter(b => bloqueado(rb, b));
    if (!bloqueados.length) {
      checks.push(check('bots_ia', L('Bots de IA permitidos', 'AI bots allowed'), 'ok', 15, 15,
        L('GPTBot, ClaudeBot, PerplexityBot y Google-Extended pueden leer tu web.', 'GPTBot, ClaudeBot, PerplexityBot and Google-Extended can read your site.'),
        L('Ya está. Si algún día quieres limitar uno, se hace en robots.txt.', 'Done. If you ever want to limit one, you do it in robots.txt.')));
    } else {
      const pts = Math.round(15 * (BOTS_IA.length - bloqueados.length) / BOTS_IA.length);
      checks.push(check('bots_ia', L('Bots de IA permitidos', 'AI bots allowed'), bloqueados.length >= 3 ? 'falta' : 'aviso', 15, pts,
        L('Bloqueas a ', 'You block ') + bloqueados.join(', ') + L('. Esos asistentes no pueden leerte ni recomendarte.', '. Those assistants can\'t read you or recommend you.'),
        L('Quitar el "Disallow: /" de esos rastreadores en robots.txt (o darles "Allow: /").', 'Remove the "Disallow: /" for those crawlers in robots.txt (or give them "Allow: /").')));
    }
  } else {
    checks.push(check('bots_ia', L('Bots de IA permitidos', 'AI bots allowed'), 'aviso', 15, 10,
      L('Sin robots.txt los bots de IA entran por defecto. Declararlo es una señal explícita de que quieres ser citado.',
        'Without robots.txt, AI bots get in by default. Declaring it is an explicit signal that you want to be cited.'),
      L('En el robots.txt nuevo, listar GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot y Google-Extended con "Allow: /".',
        'In the new robots.txt, list GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot and Google-Extended with "Allow: /".')));
  }

  // 3 · llms.txt
  const llmsOk = llms.ok && !esHTML(llms.tipo, llms.texto) && llms.texto.trim().length > 40;
  checks.push(llmsOk
    ? check('llms', L('llms.txt (ficha para los modelos)', 'llms.txt (brief for AI models)'), 'ok', 15, 15,
        L('Existe (', 'It exists (') + llms.texto.split(/\r?\n/).filter(l => l.trim()).length + L(' líneas). Es lo primero que lee un modelo cuando llega a tu sitio.', ' lines). It\'s the first thing a model reads when it reaches your site.'),
        L('Ya está: actualízalo cuando cambien precios, servicios o contacto.', 'Done. Update it when your prices, services or contact details change.'))
    : check('llms', L('llms.txt (ficha para los modelos)', 'llms.txt (brief for AI models)'), 'falta', 15, 0,
        L('No existe. Es un archivo de texto en tu raíz que le dice a los modelos quién eres, qué haces, dónde y cómo contactarte.',
          'It doesn\'t exist. It\'s a text file at your site\'s root that tells models who you are, what you do, where you are and how to contact you.'),
        L('Crear /llms.txt en texto plano: qué haces, para quién, zona, servicios, precios si los publicas, contacto y tus páginas clave.',
          'Create /llms.txt in plain text: what you do, who it\'s for, your area, services, prices if you publish them, contact details and your key pages.')));

  // 4 · datos estructurados (JSON-LD)
  const ld = extraerJsonLd(html);
  if (!ld.bloques) {
    checks.push(check('jsonld', L('Datos estructurados (JSON-LD)', 'Structured data (JSON-LD)'), 'falta', 20, 0,
      L('Tu home no declara schema.org. Los motores arman fichas de negocios con estos datos; sin ellos, adivinan o te omiten.',
        'Your homepage doesn\'t declare schema.org. Engines build business profiles from this data; without it, they guess or leave you out.'),
      L('Añadir un bloque JSON-LD tipo LocalBusiness (o el subtipo de tu rubro) con nombre, teléfono, dirección, horario, zona y servicios.',
        'Add a JSON-LD block of type LocalBusiness (or the subtype for your industry) with name, phone, address, hours, service area and services.')));
  } else if (ld.invalidos === ld.bloques) {
    checks.push(check('jsonld', L('Datos estructurados (JSON-LD)', 'Structured data (JSON-LD)'), 'aviso', 20, 6,
      L('Hay JSON-LD pero no se puede interpretar (JSON inválido): la IA lo ignora.', 'There\'s JSON-LD, but it can\'t be parsed (invalid JSON), so AI ignores it.'),
      L('Validar el bloque en validator.schema.org y corregir la sintaxis.', 'Check the block at validator.schema.org and fix the syntax.')));
  } else if (!ld.tipos.some(t => TIPOS_ENTIDAD.test(t))) {
    checks.push(check('jsonld', L('Datos estructurados (JSON-LD)', 'Structured data (JSON-LD)'), 'aviso', 20, 12,
      L('Declaras ', 'You declare ') + listar(ld.tipos, en) + L(', pero ninguno describe a tu negocio como entidad (Organization o LocalBusiness).', ', but none of them describes your business as an entity (Organization or LocalBusiness).'),
      L('Sumar un LocalBusiness/Organization con nombre, contacto, zona y horario, enlazado con @id desde tus otros bloques.',
        'Add a LocalBusiness/Organization with name, contact details, service area and hours, linked by @id from your other blocks.')));
  } else {
    checks.push(check('jsonld', L('Datos estructurados (JSON-LD)', 'Structured data (JSON-LD)'), 'ok', 20, 20,
      L('Declaras ', 'You declare ') + listar(ld.tipos, en) + L('. Con eso la IA arma tu ficha: nombre, contacto, zona.', '. With that, AI can build your profile: name, contact details, area.'),
      L('Ya está: mantén nombre, teléfono y horario idénticos a tu ficha de Google.', 'Done. Keep your name, phone and hours identical to your Google Business Profile.')));
  }

  // 5 · title, description, og:image y canonical
  const meta = extraerMeta(html);
  const faltan = [];
  if (!meta.title) faltan.push('title');
  if (!meta.description) faltan.push('description');
  if (!meta.ogImage) faltan.push('og:image');
  if (!meta.canonical) faltan.push('canonical');
  const ptsMeta = (4 - faltan.length) * 5;
  checks.push(faltan.length === 0
    ? check('meta', L('Title, description, OG y canonical', 'Title, description, OG and canonical'), 'ok', 20, 20,
        L('Los cuatro están. Título: “', 'All four are there. Title: “') + recortar(meta.title, 70) + '”.',
        L('Ya está: revisa que el título nombre tu rubro y tu ciudad.', 'Done. Check that your title names your industry and your city.'))
    : check('meta', L('Title, description, OG y canonical', 'Title, description, OG and canonical'), faltan.length >= 3 ? 'falta' : 'aviso', 20, ptsMeta,
        L('Falta: ', 'Missing: ') + faltan.join(', ') + '.' + (meta.title ? L(' Título: “', ' Title: “') + recortar(meta.title, 60) + '”.' : ''),
        L('Completar en el <head>: ', 'Add to the <head>: ') + faltan.join(', ') + L('. Son los datos con los que te titulan y te enlazan.', '. This is the data used to title your page and link to it.')));

  // 6 · sitemap.xml
  let sitemapOk = sitemap.ok && /<(urlset|sitemapindex)\b/i.test(sitemap.texto);
  let sitemapDonde = '/sitemap.xml';
  if (!sitemapOk && rb && rb.sitemaps.length) {
    const alt = await leer(rb.sitemaps[0]);
    if (alt.ok && /<(urlset|sitemapindex)\b/i.test(alt.texto)) { sitemapOk = true; sitemapDonde = rb.sitemaps[0]; }
  }
  checks.push(sitemapOk
    ? check('sitemap', 'sitemap.xml', 'ok', 10, 10,
        L('Responde un sitemap XML en ', 'An XML sitemap responds at ') + sitemapDonde + (sitemap.ok && /<lastmod>/i.test(sitemap.texto) ? L(', con fechas de modificación.', ', with last-modified dates.') : '.'),
        L('Ya está: súmale cada página nueva y su fecha (lastmod).', 'Done. Add every new page and its date (lastmod).'))
    : check('sitemap', 'sitemap.xml', 'aviso', 10, 0,
        L('No respondió un sitemap XML en /sitemap.xml. Sin él, el descubrimiento de tus páginas depende de la suerte.',
          'No XML sitemap responded at /sitemap.xml. Without one, whether your pages get discovered is left to luck.'),
        L('Publicar /sitemap.xml con tus URLs y su lastmod, y declararlo en robots.txt.', 'Publish /sitemap.xml with your URLs and their lastmod, and declare it in robots.txt.')));

  // 7 · sitemap declarado en robots.txt
  checks.push(!robotsOk
    ? check('sitemap_robots', L('Sitemap declarado en robots.txt', 'Sitemap declared in robots.txt'), 'aviso', 10, 0,
        L('Sin robots.txt tampoco hay línea "Sitemap:" declarada.', 'With no robots.txt, there\'s no "Sitemap:" line either.'),
        L('Al crear robots.txt, añadir "Sitemap: https://', 'When you create robots.txt, add "Sitemap: https://') + dominio + '/sitemap.xml".')
    : rb.sitemaps.length
      ? check('sitemap_robots', L('Sitemap declarado en robots.txt', 'Sitemap declared in robots.txt'), 'ok', 10, 10, L('Declarado: ', 'Declared: ') + rb.sitemaps[0], L('Ya está.', 'Done.'))
      : check('sitemap_robots', L('Sitemap declarado en robots.txt', 'Sitemap declared in robots.txt'), 'aviso', 10, 0,
          L('robots.txt existe pero no dice dónde está tu sitemap.', 'robots.txt exists but doesn\'t say where your sitemap is.'),
          L('Añadir la línea "Sitemap: https://', 'Add the line "Sitemap: https://') + dominio + L('/sitemap.xml" al final de robots.txt.', '/sitemap.xml" at the end of robots.txt.')));

  const puntaje = checks.reduce((a, c) => a + c.pts, 0);
  const resultado = {
    dominio, url: home.url, puntaje, ms: Date.now() - t0, fecha: new Date().toISOString(),
    extra: { titulo: meta.title || '', h1: meta.h1, lang: meta.lang || '', tipos: ld.tipos },
    checks
  };
  // Caché corta: protege de golpear dos veces el mismo sitio, pero deja que quien
  // arregla algo y vuelve a auditar vea el cambio enseguida.
  const respuesta = json(resultado, 200, { 'Cache-Control': 'public, max-age=180' });
  if (cache && ctx.waitUntil) ctx.waitUntil(cache.put(clave, respuesta.clone()));
  return respuesta;
}

/* ------------------------------------------------------------------ utilidades */

// La etiqueta se deriva de los puntos, nunca se escribe a mano: así no puede
// salir un "Atención" con 0 de 10, que es lo que confundía en el resultado.
function check(id, nombre, _estado, peso, pts, detalle, arreglo) {
  const estado = pts >= peso ? 'ok' : pts > 0 ? 'aviso' : 'falta';
  return { id, nombre, estado, peso, pts, detalle, arreglo };
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {})
  });
}

// Acepta solo nombres de dominio públicos: nada de IPs, localhost ni rutas.
function limpiarDominio(v) {
  let d = String(v).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[\/?#].*$/, '').replace(/:\d+$/, '');
  if (d.length > 253) return '';
  if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(d)) return '';
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(d)) return '';
  if (/\.(local|internal|localhost|lan|home|arpa)$/.test(d)) return '';
  return d;
}

async function pedir(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIEMPO);
  try {
    const r = await fetch(url, {
      redirect: 'follow', signal: ctrl.signal,
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.5', 'Accept-Language': 'es-PE,es;q=0.9,en;q=0.6' }
    });
    const tipo = (r.headers.get('content-type') || '').toLowerCase();
    let texto = '';
    if (r.body) {
      const lector = r.body.getReader();
      const dec = new TextDecoder('utf-8', { fatal: false });
      let leido = 0;
      while (leido < LIMITE) {
        const { value, done } = await lector.read();
        if (done) break;
        leido += value.byteLength;
        texto += dec.decode(value, { stream: true });
      }
      try { lector.cancel(); } catch (e) {}
    } else {
      texto = await r.text();
    }
    return { ok: r.ok, status: r.status, tipo, texto, url: r.url || url };
  } catch (e) {
    return { ok: false, status: 0, tipo: '', texto: '', url, error: String(e && e.name || e) };
  } finally {
    clearTimeout(t);
  }
}

// La portada: https://dominio, luego https://www., luego http://. Con la URL final
// (después de redirecciones) se arma el origen del que se leen los demás archivos.
async function cargarHome(dominio) {
  const intentos = ['https://' + dominio + '/', 'https://www.' + dominio + '/', 'http://' + dominio + '/'];
  for (const u of intentos) {
    const r = await pedir(u);
    if (r.status && r.status < 500 && r.texto) {
      let origen;
      try { origen = new URL(r.url).origin + '/'; } catch (e) { origen = u; }
      return { url: r.url, origen, html: r.texto, status: r.status };
    }
  }
  return null;
}

async function leer(url) {
  const r = await pedir(url);
  return r;
}

function esHTML(tipo, texto) {
  return /text\/html/.test(tipo) || /^\s*<(!doctype|html)/i.test(texto.slice(0, 300));
}

function parseRobots(txt) {
  const grupos = [], sitemaps = [];
  let actual = null;
  for (const raw of txt.split(/\r?\n/)) {
    const linea = raw.replace(/#.*$/, '').trim();
    if (!linea) continue;
    const m = linea.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') {
      if (!actual || actual.reglas.length) { actual = { agentes: [], reglas: [] }; grupos.push(actual); }
      actual.agentes.push(v.toLowerCase());
    } else if ((k === 'disallow' || k === 'allow') && actual) {
      actual.reglas.push({ tipo: k, ruta: v });
    } else if (k === 'sitemap' && v) {
      sitemaps.push(v);
    }
  }
  return { grupos, sitemaps };
}

function bloqueado(rb, bot) {
  const b = bot.toLowerCase();
  const g = rb.grupos.find(x => x.agentes.indexOf(b) > -1) || rb.grupos.find(x => x.agentes.indexOf('*') > -1);
  if (!g) return false;
  const cierraTodo = g.reglas.some(r => r.tipo === 'disallow' && (r.ruta === '/' || r.ruta === '/*'));
  const abreTodo = g.reglas.some(r => r.tipo === 'allow' && (r.ruta === '/' || r.ruta === '/*'));
  return cierraTodo && !abreTodo;
}

function extraerJsonLd(html) {
  const re = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m, bloques = 0, invalidos = 0;
  const tipos = [];
  const recoger = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(recoger); return; }
    let t = o['@type'];
    if (t) (Array.isArray(t) ? t : [t]).forEach(x => { x = String(x).replace(/^.*[\/#:]/, ''); if (tipos.indexOf(x) < 0) tipos.push(x); });
    if (o['@graph']) recoger(o['@graph']);
    for (const k of ['mainEntity', 'itemListElement', 'publisher', 'about', 'provider']) if (o[k]) recoger(o[k]);
  };
  while ((m = re.exec(html))) {
    bloques++;
    try { recoger(JSON.parse(m[1].trim().replace(/^\s*<!--/, '').replace(/-->\s*$/, ''))); }
    catch (e) { invalidos++; }
  }
  return { bloques, invalidos, tipos };
}

function extraerMeta(html) {
  const head = html.slice(0, 200000);
  const attrs = (tag) => {
    const o = {};
    const re = /([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let m;
    while ((m = re.exec(tag))) o[m[1].toLowerCase()] = decodificar(m[2] != null ? m[2] : m[3] != null ? m[3] : m[4]);
    return o;
  };
  let title = '';
  const t = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t) title = decodificar(t[1]).replace(/\s+/g, ' ').trim();
  let description = '', ogImage = '', canonical = '';
  const metas = head.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metas) {
    const a = attrs(tag);
    const nombre = (a.name || a.property || '').toLowerCase();
    if (nombre === 'description' && a.content && !description) description = a.content.trim();
    if ((nombre === 'og:image' || nombre === 'og:image:url') && a.content && !ogImage) ogImage = a.content.trim();
  }
  const links = head.match(/<link\b[^>]*>/gi) || [];
  for (const tag of links) {
    const a = attrs(tag);
    if ((a.rel || '').toLowerCase().split(/\s+/).indexOf('canonical') > -1 && a.href) { canonical = a.href.trim(); break; }
  }
  const h1 = (html.match(/<h1\b/gi) || []).length;
  const lang = (head.match(/<html\b[^>]*\blang\s*=\s*["']?([a-zA-Z-]+)/i) || [])[1] || '';
  return { title, description, ogImage, canonical, h1, lang };
}

function decodificar(s) {
  return String(s == null ? '' : s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

function recortar(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function listar(tipos, en) {
  const t = tipos.slice(0, 4);
  return t.join(', ') + (tipos.length > 4 ? (en ? ' and ' : ' y ') + (tipos.length - 4) + (en ? ' more' : ' más') : '');
}
