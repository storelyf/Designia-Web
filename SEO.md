# Posicionamiento — estado y pendientes

Actualizado: 2026-09-18 · Dominio: **designia360.com** · Alojamiento: GitHub → Cloudflare

---

## Lo que ya está hecho en la web

### Buscadores clásicos (Google, Bing, DuckDuckGo)
- `<title>` y `meta description` alineados al posicionamiento actual: *agencia de marketing e IA en Lima*.
- `rel="canonical"`, `hreflang` es-PE / x-default, `lang="es-PE"`, `geo.region`.
- Un solo `<h1>`, un `<h2>` por sección, HTML semántico, `alt` en todas las imágenes con `width`/`height` (sin saltos de maquetación).
- Datos estructurados en `@graph`: **ProfessionalService** (contacto, zona, precios, catálogo de planes, lista de servicios —incluidos el asistente de WhatsApp con IA y la visibilidad en buscadores de IA—), **WebSite**, **WebPage** (con `dateModified` y `speakable`) y **FAQPage** con 7 preguntas, en sincronía exacta con el acordeón visible.
- Open Graph y Twitter Card con imagen propia 1200×630 (Designio + titular).
- `sitemap.xml` con `lastmod`, `robots.txt` abierto, clave **IndexNow** en la raíz (Bing/Yandex/DuckDuckGo).
- Velocidad: cero peticiones a terceros, fuentes auto-alojadas, Designio en WebP (≈27 KB), caché larga en `_headers`.

### Buscadores de IA — GEO (ChatGPT, Gemini, Perplexity, Copilot)
Lo que un modelo necesita para citar a Designia cuando alguien pregunta por una agencia en Lima:
- **`/llms.txt`**: resumen en texto plano de qué hace la agencia, servicios, planes con precios, proceso, marcas, contacto. Es el formato que los asistentes leen primero cuando existe.
- **`robots.txt`** con permiso explícito a los rastreadores de IA: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, Amazonbot, meta-externalagent, DuckAssistBot, CCBot.
- **Frase de entidad** visible en la sección "Nosotros" ("Designia en una frase: …"): una definición completa, citable, con ubicación, servicios y precios. Marcada como `speakable`.
- **Preguntas frecuentes con respuestas directas y autocontenidas** (las dos nuevas hablan de IA y de visibilidad en buscadores de IA).
- **Datos verificables y consistentes** en todas partes: nombre, teléfono, correo, precios, marcas. La IA cruza fuentes; cualquier incoherencia resta.
- Sección propia "Buscadores de IA" que explica el servicio con una respuesta simulada (etiquetada como simulación).

---

## Lo que solo puedes hacer tú

Ordenado por impacto real.

### 1. Ficha de Google Business Profile
Para "agencia de marketing en Lima" la ficha manda sobre la web, y **también es la fuente que más consultan los asistentes de IA** para negocios locales.
- Crear y verificar en business.google.com. Categoría: *Agencia de marketing*.
- Nombre, teléfono y correo **idénticos** a la web: `Designia` · `+51 998 399 001` · `contacto@designia360.com`.
- Pedir reseñas desde el primer cliente: es lo que más pesa, en Google y en la IA.

### 2. Redirecciones en Cloudflare (importante)
Cloudflare no acepta la sintaxis `301!` de Netlify ni redirecciones entre dominios en `_redirects`. Por eso el archivo quedó solo con `/index.html → /`. Falta configurar en el panel:
- **Reglas → Redirect Rules**: `www.designia360.com/*` → `https://designia360.com/$1` (301).
- **SSL/TLS → Edge Certificates**: activar *Always Use HTTPS*.
Sin esto Google puede ver hasta cuatro versiones del sitio y repartir la fuerza entre ellas.

### 3. Paneles de buscadores
- **Google Search Console** y **Bing Webmaster Tools**: los dos `<meta>` de verificación ya están escritos y comentados en `index.html` (buscar "VERIFICACIÓN"). Pegar el código, quitar los `<!-- -->`, y enviar el sitemap en cada uno.
- **IndexNow**: cuando cambies la web, avisa a Bing con una petición a
  `https://api.indexnow.org/indexnow?url=https://designia360.com/&key=91afe59a5ec1dc6caac8ccead4a1153f`

### 4. Analítica
- **GA4**: pegar el Measurement ID en `window.GA4_ID`. Eventos ya cableados: `cta_click`, `select_plan`, `generate_lead`, `faq_open`, `scroll_depth`, `diagnostico_inicio`, `diagnostico_completado`. Marcar `generate_lead` como evento clave.
- Alternativa sin cookies: **Cloudflare Web Analytics** (gratis, se activa desde el panel del dominio, sin tocar el código).

### 5. Enlaces y menciones
Que otros dominios enlacen a designia360.com es lo que más pesa después de la ficha: webs de los clientes ("sitio hecho por…"), directorios de agencias peruanas, LinkedIn de la empresa, notas locales. Para la IA cuentan además las **menciones consistentes** del nombre con el mismo descriptor ("agencia de marketing e IA en Lima").

### 6. Contenido
Una sola página posiciona para pocos términos. Cuando toque competir por más búsquedas, el camino es un blog o páginas por servicio (`/asistente-whatsapp-ia`, `/publicidad-meta-ads-lima`, …). Cada nueva página debe sumarse al `sitemap.xml` y al `llms.txt`.

### 7. Horario de atención
Ya está: lunes a viernes de 9:00 a 18:00, en los datos estructurados (`openingHoursSpecification`), visible en la sección de contacto y en `llms.txt`. Si cambia, hay que actualizarlo en esos tres sitios y en la ficha de Google.

---

## Notas
- El correo `contacto@designia360.com` necesita **SPF, DKIM y DMARC** en el DNS de Cloudflare; sin eso, lo que envíes cae en spam.
- Los rastreadores de IA están permitidos a propósito: para una agencia que quiere ser citada, bloquearlos sería contraproducente. Si algún día se quiere limitar alguno, se hace en `robots.txt`.
- `_backup-original/`, `SEO.md`, `Isotipo-HD.png` y los originales de `marcas/` no se publican (`.assetsignore`).
