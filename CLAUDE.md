# CLAUDE.md — WebMCP Challenge

Ponme en la raíz del repo. Claude Code me lee automáticamente.

---

## 0. Antes de escribir código

**WebMCP se lanzó el 25 de agosto de 2026 y es un estándar propuesto, experimental.** Es muy probable que sea posterior a tu corte de conocimiento y que lo que "recuerdes" de él esté mal o no exista.

Verifica la API contra la fuente antes de escribir nada:

- https://developer.chrome.com/docs/ai/webmcp
- https://developer.chrome.com/docs/ai/webmcp/imperative-api
- https://learn.chatgpt.com/docs/webmcp
- Tipos: paquete npm `webmcp-types` · Hooks de React: `usewebmcp`

**✅ API verificada contra las tres fuentes el 27-ago-2026.** Correcciones respecto a la reconstrucción original:

- `document.modelContext.registerTool()` confirmado como punto de entrada (Chrome y ChatGPT coinciden).
- La desregistración **no** va dentro de la definición de la tool: `registerTool()` recibe un **segundo argumento de opciones** con el signal — `registerTool(toolDef, { signal: controller.signal })` — y `controller.abort()` desregistra. Desde Chrome 153, desregistrar no rompe ejecuciones en vuelo.
- `execute(params, { signal })` y el evento `toolchange` en `document.modelContext` confirmados. Existe también la annotation `untrustedContentHint` además de `readOnlyHint`.
- ChatGPT **solo soporta la API imperativa** (la declarativa no) y **no soporta tools registradas en iframes**. Solo GPT-5.6 Sol/Terra, apps de escritorio ChatGPT Work y Codex; Enterprise/Edu no.
- El `execute` puede devolver string u objeto (los docs de ChatGPT devuelven objetos). Devolver suficiente información para que el agente verifique el resultado.
- Paquetes npm confirmados en el registry: `webmcp-types` 0.1.5 · `usewebmcp` 5.0.1.

---

## 1. Qué es este repo

Rebanada **pública y open source** extraída del EHR privado de una startup de salud mexicana, para competir en el **OpenAI WebMCP Challenge**.

**Entrega: jueves 3 de septiembre de 2026, 1:00 PM PT (2:00 PM Monterrey).**
Juzgamiento del 4 al 21 de septiembre — la URL en vivo tiene que seguir arriba todo ese tiempo.

### La tesis

Un expediente clínico donde el médico y el agente trabajan sobre **la misma página viva, dentro de la sesión ya autenticada del médico**.

No es un scribe. No captura la consulta. **Interroga el expediente que ya está abierto y mueve la interfaz** para mostrar lo que encontró.

Por qué esto exige WebMCP y no otra cosa: ningún hospital le entrega credenciales de su EHR a un agente externo. Con WebMCP no hay handoff de credenciales — el agente opera dentro de la sesión que el médico ya abrió, y cada acción queda visible en el expediente que el médico está viendo.

### El filtro para cualquier decisión

**Si le quito WebMCP, ¿esto se rompe o solo se pone menos cómodo?**
Si solo se pone menos cómodo, no va.

---

## 2. Reglas duras — no negociables

1. **Cero datos reales de paciente.** Ni en la app, ni en el video, ni en un commit. El historial de git es permanente aunque después borres el archivo. Todo paciente es sintético.
2. **Este repo es público.** Nunca traigas del repo privado: `.env`, llaves, cadenas de conexión, endpoints internos, nombres de hospitales o clientes reales.
3. **Licencia MIT en la raíz**, visible en la sección About de GitHub. Es requisito de las reglas.
4. **Ninguna tool de escritura ejecuta sola.** Siempre requiere interacción del médico.
5. Código, comentarios, commits, README y texto de la submission **en inglés**. Este archivo puede quedarse en español.

---

## 3. La API de WebMCP

### Registro imperativo

```js
// El controller vive con el componente del expediente:
// registrar al montar, controller.abort() al desmontar.
const controller = new AbortController();

await document.modelContext.registerTool({
  name: 'plot_lab_trend',
  description: 'Plots a lab analyte over time for the open patient chart.',
  inputSchema: {
    type: 'object',
    properties: {
      analyte: { type: 'string', description: 'e.g. creatinine, HbA1c' },
      from: { type: 'string', format: 'date' },
      to: { type: 'string', format: 'date' },
    },
    required: ['analyte'],
  },
  annotations: { readOnlyHint: true },
  execute: async ({ analyte, from, to }, { signal }) => {
    if (signal?.aborted) throw new Error('cancelled');
    const series = await loadSeries(analyte, from, to);
    renderTrendChart(series);           // mueve la UI, esto es el punto
    return `Plotted ${series.length} ${analyte} values.`;
  },
}, { signal: controller.signal });   // ← el signal va en el 2.º argumento, no en la definición
```

### Detección de soporte — obligatoria

El sitio tiene que funcionar igual sin WebMCP. Esto es progressive enhancement y dos de los jueces vienen de plataforma web.

```js
if (typeof document.modelContext?.registerTool === 'function') {
  registerChartTools();
}
```

### Registro dinámico por contexto

**Esto es lo que más separa "entendí la API" de "le pegué tools encima".**

Las tools del expediente **solo existen mientras hay un expediente abierto**. La lista de pacientes expone otras. Al cerrar, se desregistran vía `AbortController`. Es exactamente para lo que existe el evento `toolchange`.

En React va atado al ciclo de vida del componente del expediente: registrar al montar, abortar al desmontar.

### Restricciones de plataforma

- Requiere documentos con **origin isolation**
- Está detrás del Permissions Policy `tools` (default `self`; deshabilitado en iframes cross-origin salvo `allow="tools"`)

---

## 4. Las tools

### Core — sin estas no hay entrega

| Tool | Tipo | Comportamiento |
|---|---|---|
| `get_chart_summary` | read | Deltas desde la última visita. Devuelve estructura, no prosa |
| `plot_lab_trend` | read | **Renderiza la gráfica en pantalla** y devuelve qué graficó |
| `draft_note` | write | Propone nota anclada. **Requiere aprobación del médico** |

### Stretch — solo si el core está sólido

| Tool | Tipo | Comportamiento |
|---|---|---|
| `highlight_findings` | read | Marca valores fuera de rango en la vista. Barato y muy visual — **✅ hecha 28-ago (pulso ámbar 15 s + píldora de actividad del agente)** |
| `order_lab_panel` | write | Orden de laboratorio con confirmación explícita — descartada: `draft_note` ya demuestra el patrón de escritura con aprobación |

**Dos tools pulidas ganan a seis a medias.** Se juzga criterio, no cantidad. No agregues tools por tener más.

Regla de diseño: `annotations: { readOnlyHint: true }` en todas las de lectura. Las de escritura devuelven una propuesta que el médico aprueba en la UI — nunca escriben directo.

---

## 5. El paciente sintético

**Diseñado, no aleatorio.** Necesita una señal enterrada que un médico plausiblemente perdería en una consulta de 15 minutos: cada valor aislado se ve casi normal, la tendencia no.

La forma (validar con un médico antes de grabar):

| Fecha | Creatinina | Lectura aislada |
|---|---|---|
| Mar 2024 | 0.9 | Normal |
| Oct 2024 | 1.1 | Normal |
| Abr 2025 | 1.3 | Límite alto |
| Ene 2026 | 1.5 | Fuera de rango |

Diabético tipo 2. Las 4 químicas separadas por meses y repartidas entre notas de evolución, para que ningún valor quede junto al anterior en pantalla.

### Ruido realista — esta es la ventaja injusta

Los demos de los demás van a tener expedientes perfectamente limpios y cualquier médico sabrá que son falsos. Este necesita:

- Notas libres mal escritas, con abreviaturas
- Un estudio que llega como PDF escaneado
- Campos obligatorios que nadie llenó
- Vocabulario real: "Química sanguínea de 27 elementos", códigos CIE-10, formato de notas NOM-004

Más 8 a 12 pacientes de relleno para que la lista no se vea vacía. Todo por seed script reproducible.

---

## 6. La secuencia que tiene que funcionar

Esto es el video, y el video es lo que califican. Los jueces **pueden evaluar sin abrir la app**.

Con el expediente abierto, el médico escribe:

> ¿Qué cambió desde la última visita?

Y el dashboard se mueve solo, paso por paso, visible:

1. Salta al panel de laboratorio
2. Grafica la tendencia de creatinina de los últimos 2 años
3. Resalta los dos valores fuera de rango
4. Propone una nota anclada donde ocurrió el cambio — **el médico aprueba**

Cada paso tiene que **verse ocurrir**. Estados de carga deliberados, no instantáneos y no como glitch. Si el movimiento no se lee en pantalla, no sirve aunque funcione.

---

## 7. Cómo probar

1. Chrome 149 o superior
2. `chrome://flags/#enable-webmcp-testing` → activar → reiniciar
   **Ojo para producción:** el flag es solo para desarrollo local. Para que la URL en vivo funcione en el Chrome de un juez sin flags, el dominio tiene que estar registrado en el **origin trial** de WebMCP y servir el token. Sin eso, solo funcionaría en ChatGPT desktop.
3. Extensión **Model Context Tool Inspector** (Chrome Web Store): muestra qué tools registró la página, permite llamarlas a mano para validar el schema, ver el output que le llega al modelo, y hablarle en lenguaje natural al agente

La prueba que importa no es que la tool corra. Es que **el agente escoja la tool correcta** desde lenguaje natural. Si no la escoge, el problema está en el `description` o en el `inputSchema`, no en el código.

**✅ Validado con agente real el 28-ago-2026** (Gemini vía Model Context Tool Inspector oficial, Chrome 151 + flag): "What changed since the last visit?" → `get_chart_summary` · "Show me the creatinine trend" → `plot_lab_trend` (la pantalla navegó y abrió la gráfica sola) · "Draft a note about this finding" → `draft_note` (borrador en Notas → botón Sign). Las tres a la primera, sin ajustar descriptions.

Alternativa: navegador interno de la app de escritorio de ChatGPT, con GPT-5.6 Sol o Terra (Luna trae WebMCP apagado). Los jueces pueden usar cualquiera de las dos, así que si se puede, probar en ambas.

---

## 8. Fuera de alcance

- **Scribe por voz / escritura ambiental.** Ya está resuelto por Abridge, Nuance DAX, Nabla y Suki, y además no necesita WebMCP. El scope creep va a jalar hacia acá. No vayas.
- API declarativa con `toolname` en forms — no encaja con este caso de uso
- Autenticación real, multi-tenant, cualquier cosa de producción que no aparezca en el video
- Tools stretch antes de que las core estén sólidas

---

## 9. Pendientes al arrancar

- [x] Descubrir el stack del frontend — **Vite 5 + React 18 + TS + MUI 5**, gráficas con recharts. Decisión: **API imperativa con hook propio** (~40 líneas); `usewebmcp` 5.0.1 existe pero no está vetado y a una semana de la entrega pesa menos superficie desconocida
- [x] Localizar el componente del expediente — `PatientDetailPage.tsx` (ruta `/pacientes/:id`, secciones por query param `?section=`); la gráfica ya existe: `AnalyteGraph` (recharts, con banda de referencia) + `AnalyteGraphProvider.openAnalyteGraph()` — `plot_lab_trend` invoca ese mecanismo, no inventa UI
- [x] Extraer esquema de paciente y laboratorio — `lab_results` (una fila por analito/estudio: `analyteNormalized`, `valueNumeric`, `unit`, `refLow`/`refHigh`, `status` manual, `studyDate`; historia deduplicada a un punto por día; usar `analyteName: "Creatinina suero"` → LOINC 2160-0), `evolution_notes` (SOAP + DRAFT/SIGNED/AMENDED + revisiones), `users` (`role=patient`, `patientType=demo`)
- [ ] Confirmar que no se arrastró ningún secreto ni dato real en la extracción — auditoría de los repos fuente hecha el 27-ago; deny-list definida: `.env`, `.verify-shots/`, `auth-header.png`, `deploy/`, `logs/`, interceptores de `services/api.ts`. Verificar archivo por archivo al copiar
- [x] LICENSE (MIT) en la raíz antes del primer push — a nombre de Healthy Medical AI, S. de R.L. de C.V.
- [ ] Origin trial de WebMCP para el dominio de producción — **rebajado a opcional** tras leer las reglas oficiales: los jueces acceden "using ChatGPT's in-app browser or Google Chrome with WebMCP enabled", o sea que se espera que activen el flag. El token es defensa en profundidad, no bloqueante

## 10. Requisitos oficiales de entrega (verificados en Devpost el 27-ago-2026)

Cierre **3-sep-2026 1:00 PM PT** (confirmado — la sección 1 tenía razón). Juzgamiento 4-sep 10:00 AM → 21-sep 5:00 PM PT; la app debe seguir **gratis y sin restricción** todo ese periodo. México es elegible.

- [x] **URL viva** — https://healthy-record-webmcp.netlify.app (Netlify, deploy 28-ago). Verificado en producción: `modelContext` presente, chip "Agent · 3 tools", harness dev excluido del build, `Origin-Agent-Cluster: ?1`, deep links SPA OK, 0 errores de consola
- [ ] **Video < 3 minutos**, público en YouTube, demo claro **con audio**
- [x] **Repo público** con licencia open source "detectable y visible al tope de la página del repo" — publicado en github.com/LFLQ222/healthy-record-webmcp el 28-ago; GitHub detecta "MIT License" ✓. Falta: llenar About + topics en la UI
- [ ] **Descripción escrita** que responda exactamente: (1) por qué el caso de uso es fuerte para WebMCP, (2) cómo crea mejor UX, (3) qué pueden hacer personas y agentes **juntos**

Criterios, peso igual: **WebMCP Leverage · Execution · Potential Impact · Creativity & Ambition**. Jueces: Andrew Galloni (Cloudflare), **Alex Nahas (creador de MCP-B)**, Ilya Grigorik (Shopify), Jude Gao (Vercel/Next.js), Justin Rushing (OpenAI, Browser Platform), **Sarah Drasner (Chrome)**, Sean Roberts (Netlify). Todos de plataforma web/infra — **cero perfil salud**: el video y la descripción no pueden asumir contexto clínico.
