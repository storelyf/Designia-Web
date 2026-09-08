# Posicionamiento — estado y pendientes

Actualizado: 2026-09-05 · Dominio: **designia360.com**

---

## Lo que ya está hecho en la web

### Lo básico que leen todos los buscadores
- `<title>` y `meta description` únicos y escritos para captar clic, no solo palabras clave.
- `rel="canonical"` apuntando a `https://designia360.com/` — evita que Google indexe dos versiones.
- `hreflang` `es-pe` y `x-default`.
- `lang="es-PE"` en el `<html>`, y `geo.region` / `geo.placename` para Lima.
- Un solo `<h1>`, jerarquía limpia de `<h2>` por sección, HTML semántico
  (`header`, `nav`, `main`, `section`, `article`, `footer`).
- `alt` descriptivo en todas las imágenes, con `width` y `height` para que nada
  salte al cargar (eso es CLS, uno de los tres Core Web Vitals).

### Datos estructurados (`schema.org`)
Van en formato `@graph`, que es como Google enlaza las entidades entre sí:
- **ProfessionalService** — nombre, logo, teléfono, correo, dirección, zona de servicio,
  rango de precios, redes, temas que domina, catálogo de planes y lista de servicios.
- **WebSite** — enlazado al editor (la agencia).
- **FAQPage** — las 5 preguntas frecuentes. Es lo que puede hacer que aparezcan
  desplegables debajo del resultado en Google.

### Redes sociales
Open Graph y Twitter Card completos, con imagen 1200×630 propia (`og-designia.jpg`).
Es lo que se ve al pegar el enlace en WhatsApp, LinkedIn o Instagram.

### Velocidad (pesa en el ranking, sobre todo en móvil)
- Cero peticiones a terceros: sin CDN, sin librerías externas, sin Google Fonts.
- Fuentes auto-alojadas en subconjunto latin y precargadas.
- ~174 KB comprimidos en total.
- `_headers` con caché larga para fuentes e imágenes.

### Rastreo e indexación
- `robots.txt` abierto, con el sitemap declarado.
- `sitemap.xml` con `lastmod` e imagen.
- `_redirects` que fuerza una sola versión: `www` → sin `www`, `http` → `https`,
  `/index.html` → `/`. Sin esto, Google puede ver hasta cuatro sitios distintos.
- **IndexNow**: la clave `91afe59a5ec1dc6caac8ccead4a1153f.txt` ya está en la raíz.
  Es el protocolo de Bing, Yandex y DuckDuckGo para avisar cambios al instante en
  vez de esperar a que pasen a rastrear.

---

## Lo que solo puedes hacer tú

Ordenado por impacto real. Los tres primeros valen más que cualquier ajuste técnico
que quede por hacer en la web.

### 1. Ficha de Google Business Profile — el mayor peso en búsqueda local
Para "agencia de marketing digital en Lima" y similares, la ficha manda sobre la web.
- Crearla y verificarla en business.google.com
- Categoría principal: *Agencia de marketing*
- El nombre, teléfono y correo deben coincidir **exactos** con los de la web:
  `Designia` · `+51 998 399 001` · `contacto@designia360.com`
- Pedir reseñas desde el primer cliente. Es el factor que más mueve la aguja.

### 2. Dar de alta el sitio en los paneles
- **Google Search Console** → search.google.com/search-console
- **Bing Webmaster Tools** → bing.com/webmasters (cubre también Yahoo y DuckDuckGo;
  además permite importar directo desde Search Console)

En ambos, verificar con la etiqueta HTML: los dos `<meta>` ya están escritos en
`index.html`, comentados. Solo hay que pegar el código y quitar los `<!-- -->`.
Después, enviar el sitemap en cada panel.

### 3. Enlaces desde otros sitios
Que otros dominios enlacen a designia360.com es de lo que más pesa. Lo alcanzable:
directorios de agencias peruanas, la web de los clientes ("sitio hecho por…"),
gremios, notas de prensa locales.

### 4. Contenido
Una sola página posiciona para pocos términos. Si en algún momento quieres competir
por más búsquedas, el camino es un blog o páginas por servicio
(`/marketing-digital-lima`, `/publicidad-meta-ads`, etc.).

### 5. Horario de atención en los datos estructurados
No lo puse porque no me consta cuál es, y en datos estructurados una hora inventada
es peor que ninguna. Cuando lo definas, se agrega `openingHoursSpecification`.

---

## Notas

- El correo `contacto@designia360.com` necesita que el dominio tenga **SPF, DKIM y DMARC**
  configurados. Sin eso, los correos que envíes caen en spam — y eso sí afecta la
  reputación de la marca, aunque no el ranking.
- Si algún día se decide bloquear a los rastreadores de IA (GPTBot, ClaudeBot, etc.),
  se hace en `robots.txt`. Hoy están permitidos, que es lo habitual para una agencia
  que quiere ser citada.
