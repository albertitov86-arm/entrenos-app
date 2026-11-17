"use strict";
/* =====================================================================
   Gráficos SVG (sin librerías) + vistas Panel e Informe detallado.
   Colores: series en orden fijo (azul, naranja, aqua); estados con
   icono + texto, nunca solo color. Un eje Y por gráfico.
   ===================================================================== */
const COL = { s1: "#3987e5", s2: "#d95926", s3: "#199e70", good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b",
  grid: "#2a313d", eje: "#8b95a5", band: "rgba(255,255,255,.045)" };
const ICONO = { good: "✓", warning: "!", serious: "!", critical: "✕" };
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fCorta = iso => { const d = new Date(iso + "T12:00:00"); return `${d.getDate()} ${MES[d.getMonth()]}`; };
const hms = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}h${String(m).padStart(2, "0")}` : `${m}'`; };
const GRAF = {};
// Ancho real disponible: así el SVG no se deforma y el texto se ve nítido
const anchoGraf = () => Math.max(260, Math.min(640, window.innerWidth) - 28 - 30);               // configuraciones de gráficos para el hover
let grafId = 0;

/* ---------- Gráfico de líneas con cruz y tooltip (sincronizable) ---------- */
function gLineas({ series, x, alto = 150, yMin, yMax, bandas = [], refs = [], marcas = [], grupo = null, fx = v => v, fy = v => v, unidad = "", relleno = false }) {
  const id = "g" + (++grafId), W = anchoGraf(), H = alto, PL = 34, PR = 8, PT = 8, PB = 20;
  const vals = series.flatMap(s => s.v).filter(v => v != null);
  if (!vals.length) return `<div class="empty sm">Sin datos todavía</div>`;
  let lo = yMin ?? Math.min(...vals, ...refs.map(r => r.y)), hi = yMax ?? Math.max(...vals, ...refs.map(r => r.y));
  if (hi === lo) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; if (yMin == null) lo -= pad; if (yMax == null) hi += pad;
  const n = x.length, X = i => PL + (n <= 1 ? 0 : i * (W - PL - PR) / (n - 1)), Y = v => PT + (hi - v) * (H - PT - PB) / (hi - lo);
  let s = "";
  for (const b of bandas) {
    const y1 = Y(Math.min(hi, b.hasta)), y2 = Y(Math.max(lo, b.desde)); if (y2 <= y1) continue;
    s += `<rect x="${PL}" y="${y1}" width="${W - PL - PR}" height="${y2 - y1}" fill="${b.color || COL.band}"/>`;
    if (b.label) s += `<text x="${W - PR - 4}" y="${y1 + 11}" text-anchor="end" class="gt">${b.label}</text>`;
  }
  const ticks = 4;
  for (let k = 0; k <= ticks; k++) {
    const v = lo + (hi - lo) * k / ticks, y = Y(v);
    s += `<line x1="${PL}" x2="${W - PR}" y1="${y}" y2="${y}" stroke="${COL.grid}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    s += `<text x="${PL - 5}" y="${y + 3.5}" text-anchor="end" class="gt">${fy(Math.round(v))}</text>`;
  }
  const nTicks = Math.min(5, n);
  for (let k = 0; k < nTicks; k++) {
    const i = Math.round(k * (n - 1) / Math.max(1, nTicks - 1));
    s += `<text x="${X(i)}" y="${H - 5}" text-anchor="${k === 0 ? "start" : k === nTicks - 1 ? "end" : "middle"}" class="gt">${fx(x[i])}</text>`;
  }
  for (const r of refs) s += `<line x1="${PL}" x2="${W - PR}" y1="${Y(r.y)}" y2="${Y(r.y)}" stroke="#fff" stroke-opacity=".45" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>` +
    `<text x="${PL + 4}" y="${Y(r.y) - 4}" class="gt">${r.label}</text>`;
  for (const mk of marcas) {
    const i = x.indexOf(mk.x); if (i < 0) continue;
    s += `<line x1="${X(i)}" x2="${X(i)}" y1="${PT}" y2="${H - PB}" stroke="${mk.color || "#fff"}" stroke-opacity="${mk.color ? 1 : .5}" stroke-width="1.5" ${mk.discontinua ? 'stroke-dasharray="3 3"' : ""} vector-effect="non-scaling-stroke"/>` +
      `<text x="${X(i) - 4}" y="${mk.abajo ? H - PB - 5 : PT + 10}" text-anchor="end" class="gt" style="fill:#e8ebf0">${mk.label}</text>`;
  }
  for (const se of series) {
    let d = "", abierto = false;
    se.v.forEach((v, i) => { if (v == null) { abierto = false; return; } d += `${abierto ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`; abierto = true; });
    if (relleno && series.length === 1) {
      const ini = se.v.findIndex(v => v != null), fin = se.v.length - 1 - [...se.v].reverse().findIndex(v => v != null);
      s += `<path d="${d}L${X(fin)},${Y(lo)}L${X(ini)},${Y(lo)}Z" fill="${se.color}" fill-opacity=".18"/>`;
    }
    s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${se.discontinua ? 'stroke-dasharray="5 4"' : ""}/>`;
  }
  s += `<line class="cruz" x1="0" x2="0" y1="${PT}" y2="${H - PB}" stroke="#fff" stroke-opacity=".5" vector-effect="non-scaling-stroke" style="display:none"/>`;
  s += series.map((se, k) => `<circle class="pto p${k}" r="4" fill="${se.color}" stroke="#171b22" stroke-width="2" style="display:none"/>`).join("");
  GRAF[id] = { series, x, X, Y, W, PL, PR, n, grupo, fx, unidad };
  const leyenda = series.length > 1 ? `<div class="leyenda">${series.map(se => `<span><i style="background:${se.color}${se.discontinua ? ";height:2px" : ""}"></i>${se.nombre}</span>`).join("")}</div>` : "";
  return `${leyenda}<div class="graf" data-g="${id}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">${s}</svg><div class="tip" style="display:none"></div></div>`;
}

/* ---------- Barras verticales con tooltip ---------- */
function gBarras({ etiquetas, valores, alto = 140, color = COL.s1, destacar = -1, unidad = "", detalle = [] }) {
  const id = "g" + (++grafId), W = anchoGraf(), H = alto, PL = 34, PR = 8, PT = 14, PB = 20;
  const max = Math.max(1, ...valores) * 1.1, n = valores.length, paso = (W - PL - PR) / n, bw = Math.min(46, Math.max(4, paso - 6));
  const Y = v => PT + (max - v) * (H - PT - PB) / max;
  let s = "";
  for (let k = 0; k <= 3; k++) { const v = max * k / 3, y = Y(v);
    s += `<line x1="${PL}" x2="${W - PR}" y1="${y}" y2="${y}" stroke="${COL.grid}" vector-effect="non-scaling-stroke"/><text x="${PL - 5}" y="${y + 3.5}" text-anchor="end" class="gt">${Math.round(v)}</text>`; }
  valores.forEach((v, i) => {
    const x = PL + i * paso + (paso - bw) / 2, y = Y(v), h = Math.max(0, H - PB - y), r = Math.min(4, bw / 2, h);
    const fill = i === destacar ? "none" : color, st = i === destacar ? `stroke="${color}" stroke-width="2" stroke-dasharray="4 3"` : "";
    s += h > 0 ? `<path d="M${x},${H - PB}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${H - PB}Z" fill="${fill}" ${st} vector-effect="non-scaling-stroke"/>` : "";
    if (i % Math.ceil(n / 6) === 0 || i === n - 1) s += `<text x="${x + bw / 2}" y="${H - 5}" text-anchor="middle" class="gt">${etiquetas[i]}</text>`;
  });
  GRAF[id] = { barras: true, valores, etiquetas, detalle, unidad, n, PL, PR, W };
  return `<div class="graf" data-g="${id}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">${s}</svg><div class="tip" style="display:none"></div></div>`;
}

/* ---------- Barra apilada 100 % (zonas) ---------- */
const COL_Z = { Z1: "var(--z1)", Z2: "var(--z2)", Z3: "var(--z3)", Z4: "var(--z4)", Z5: "var(--z5)", "Z6+": "var(--z6)" };
const NOM_Z = { Z1: "Recuperación", Z2: "Resistencia", Z3: "Tempo", Z4: "Umbral", Z5: "VO2max", "Z6+": "Anaeróbico" };
function gZonas(zonas) {
  const orden = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6+"].filter(z => zonas && zonas[z]);
  const total = orden.reduce((a, z) => a + zonas[z], 0);
  if (!total) return `<div class="empty sm">Sin datos de potencia</div>`;
  const barra = orden.map(z => `<i style="flex:${zonas[z]};background:${COL_Z[z]}" title="${z} ${Math.round(zonas[z] / total * 100)} %"></i>`).join("");
  const filas = orden.map(z => { const p = zonas[z] / total * 100;
    return `<div class="zf"><span><i style="background:${COL_Z[z]}"></i>${z} · ${NOM_Z[z]}</span><b>${p < 1 ? "<1" : Math.round(p)} %</b><span class="mut">${hms(zonas[z])}</span></div>`; }).join("");
  return `<div class="zbar">${barra}</div><div class="zfilas">${filas}</div>`;
}

/* ---------- Anillo de puntuación (stat tile) ---------- */
function anillo(valor, etiqueta, estado, tam = 76) {
  const r = 30, c = 2 * Math.PI * r, col = COL[estado] || COL.s1, v = Math.max(0, Math.min(100, valor ?? 0));
  return `<div class="anillo" style="min-width:${tam}px"><div class="ring" style="width:${tam}px;height:${tam}px"><svg viewBox="0 0 76 76" width="${tam}" height="${tam}">
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="${COL.grid}" stroke-width="7"/>
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${c * v / 100} ${c}" transform="rotate(-90 38 38)"/></svg>
    <b style="font-size:${Math.round(tam / 4)}px">${valor == null ? "–" : valor}</b></div>${etiqueta ? `<span>${etiqueta}</span>` : ""}</div>`;
}
const estadoDe = v => v == null ? "s1" : v >= 85 ? "good" : v >= 60 ? "warning" : "critical";
const chipEstado = (estado, texto) => `<span class="est est-${estado}"><b>${ICONO[estado] || "•"}</b>${texto}</span>`;

/* ---------- Interacción: cruz + tooltip, sincronizada por grupo ---------- */
function activarGraficos() {
  document.querySelectorAll(".graf").forEach(el => {
    const g = GRAF[el.dataset.g]; if (!g) return;
    const mover = ev => {
      const r = el.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * g.W;
      let i;
      if (g.barras) i = Math.floor((px - g.PL) / ((g.W - g.PL - g.PR) / g.n));
      else i = Math.round((px - g.PL) / ((g.W - g.PL - g.PR) / Math.max(1, g.n - 1)));
      i = Math.max(0, Math.min(g.n - 1, i));
      const objetivos = g.grupo ? [...document.querySelectorAll(".graf")].filter(e => GRAF[e.dataset.g]?.grupo === g.grupo) : [el];
      objetivos.forEach(e => mostrar(e, i, e === el ? (ev.clientX - r.left) / r.width : null));
    };
    const salir = () => { const objs = g.grupo ? [...document.querySelectorAll(".graf")].filter(e => GRAF[e.dataset.g]?.grupo === g.grupo) : [el];
      objs.forEach(e => { e.querySelector(".tip").style.display = "none"; e.querySelectorAll(".cruz,.pto").forEach(c => c.style.display = "none"); }); };
    el.addEventListener("pointermove", mover); el.addEventListener("pointerdown", mover); el.addEventListener("pointerleave", salir);
  });
}
function mostrar(el, i, frac) {
  const g = GRAF[el.dataset.g], tip = el.querySelector(".tip");
  let html;
  if (g.barras) html = `<b>${g.etiquetas[i]}</b><br>${g.valores[i]} ${g.unidad}${g.detalle[i] ? "<br>" + g.detalle[i] : ""}`;
  else {
    const cx = g.X(i);
    const cruz = el.querySelector(".cruz"); cruz.setAttribute("x1", cx); cruz.setAttribute("x2", cx); cruz.style.display = "";
    g.series.forEach((se, k) => { const c = el.querySelector(".p" + k), v = se.v[i];
      if (v == null) { c.style.display = "none"; return; } c.setAttribute("cx", cx); c.setAttribute("cy", g.Y(v)); c.style.display = ""; });
    html = `<b>${g.fx(g.x[i], true)}</b>` + g.series.map(se => `<br><i style="background:${se.color}"></i>${se.nombre}: <b>${se.v[i] ?? "–"}</b>${se.u ?? g.unidad}`).join("");
  }
  tip.innerHTML = html; tip.style.display = "";
  const f = frac ?? (g.barras ? (i + .5) / g.n : g.X(i) / g.W);
  tip.style.left = f > .6 ? "" : `calc(${f * 100}% + 10px)`; tip.style.right = f > .6 ? `calc(${(1 - f) * 100}% + 10px)` : "";
}

/* =====================================================================
   VISTA PANEL
   ===================================================================== */
function vPanel() {
  const p = panel;
  if (!p) return `<div class="card empty">El panel aparecerá tras la próxima ejecución automática (cada hora de 7 a 23 h).<br><br>
    <button class="b pri" onclick="lanzarInforme()">Actualizar ahora</button></div>`;
  const d = p.disposicion, h = p.hoy;
  let o = `<div class="card hero">
    <div class="row" style="gap:14px">${anillo(d.puntos, "hoy", d.estado, 92)}
      <div class="sp"><div class="mut sm">Disposición para entrenar</div><div class="big">${esc(d.texto)}</div>
      <div class="mut sm">${fCorta(p.generado_dia)} · orientativo</div></div></div>
    <div class="factores">${d.factores.map(f => `<div class="fac">${chipEstado(f.estado, esc(f.nombre))}<b>${esc(f.valor)}</b><span class="mut">${esc(f.texto)}</span></div>`).join("")}</div>
  </div>`;

  if (p.objetivos?.length) o += `<div class="cuenta">${p.objetivos.slice(0, 3).map(ob => `<div class="card cd"><b>${ob.dias}</b><span>días</span><div class="sm">${esc(ob.nombre)}</div><div class="mut sm">${ob.tipo} · ${fCorta(ob.fecha)}</div></div>`).join("")}</div>`;

  if (p.adaptacion?.length) o += `<div class="card">${p.adaptacion.map(t => `<div class="row" style="gap:8px;margin:3px 0">${chipEstado("good", "Plan")}<span class="sm">${esc(t)}</span></div>`).join("")}</div>`;

  if (p.proyeccion?.serie?.length) {
    const pr = p.proyeccion, hist = p.serie.slice(-42), xs2 = [...hist.map(s => s.d), ...pr.serie.map(s => s.d)];
    const nH = hist.length, nP = pr.serie.length, fx2 = (d, largo) => largo ? fCorta(d) : fCorta(d).replace(" ", "/");
    const marcas = [{ x: p.generado_dia, label: "hoy", discontinua: true }, ...pr.veredictos.map(v => ({ x: v.fecha, label: nombreCorto(v.nombre), color: COL.s2, abajo: true }))];
    o += `<h2>Camino a tus pruebas</h2>${pr.veredictos.map(v => `<div class="card">
        <div class="row"><b class="sp">${esc(v.nombre)}</b>${chipEstado(v.estado, v.estado === "good" ? "En buen camino" : "Revisar")}</div>
        <div class="chips c3"><div class="chip"><b>${v.ctl}</b><span>Fitness previsto</span></div><div class="chip"><b>${v.tsb > 0 ? "+" : ""}${v.tsb}</b><span>Forma el día</span></div><div class="chip"><b>${fCorta(v.fecha)}</b><span>${v.tipo}</span></div></div>
        <p class="ayuda">${esc(v.texto)}</p></div>`).join("")}
      <div class="card"><div class="sub">Fitness: real y previsto si cumples el plan</div>
      ${gLineas({ series: [{ nombre: "Fitness real", color: COL.s1, v: [...hist.map(s => s.ctl), ...Array(nP).fill(null)] },
                           { nombre: "Fitness previsto", color: COL.s1, discontinua: true, v: [...Array(nH - 1).fill(null), hist[nH - 1]?.ctl ?? null, ...pr.serie.map(s => s.ctl)] }],
          x: xs2, fx: fx2, alto: 150, marcas, grupo: "proy" })}
      <div class="sub">Forma prevista (TSB)</div>
      ${gLineas({ series: [{ nombre: "Forma", color: COL.s3, v: [...hist.map(s => s.tsb), ...pr.serie.map(s => s.tsb)] }], x: xs2, fx: fx2, alto: 120, marcas, grupo: "proy",
          bandas: [{ desde: 5, hasta: 25, label: "ideal para competir", color: "rgba(57,135,229,.10)" }, { desde: -99, hasta: -30, label: "riesgo", color: "rgba(208,59,59,.10)" }] })}
      ${pr.aviso ? `<p class="ayuda">${chipEstado("warning", "Ojo")} ${esc(pr.aviso)}</p>` : ""}
      <p class="ayuda">Supone que haces las sesiones planificadas y tu carga habitual el resto de días. Se recalcula cada hora.</p></div>`;
  }

  const ult = p.ftp_hist?.length ? p.ftp_hist[p.ftp_hist.length - 1].eftp : null;
  const wkg = p.peso ? (p.ftp / p.peso).toFixed(2) : null;
  o += `<div class="chips c4">
    <div class="chip"><b>${h.ctl ?? "–"}</b><span>Fitness</span></div>
    <div class="chip"><b>${h.atl ?? "–"}</b><span>Fatiga</span></div>
    <div class="chip"><b>${h.tsb ?? "–"}</b><span>Forma</span></div>
    <div class="chip"><b>${p.ftp}</b><span>FTP W${wkg ? " · " + wkg + " W/kg" : ""}</span></div></div>`;

  const S = p.serie, xs = S.map(s => s.d), fx = (d, largo) => largo ? fCorta(d) : fCorta(d).replace(" ", "/");
  o += `<h2>Fitness y fatiga · 90 días</h2><div class="card">${gLineas({ series: [
      { nombre: "Fitness (CTL)", color: COL.s1, v: S.map(s => s.ctl) }, { nombre: "Fatiga (ATL)", color: COL.s2, v: S.map(s => s.atl) }],
      x: xs, fx, alto: 160, grupo: "fit" })}
    <p class="ayuda">El <b>fitness</b> sube despacio con semanas constantes; la <b>fatiga</b> refleja los últimos 7 días.</p></div>`;
  o += `<h2>Forma (TSB)</h2><div class="card">${gLineas({ series: [{ nombre: "Forma", color: COL.s3, v: S.map(s => s.tsb) }], x: xs, fx, alto: 130, grupo: "fit",
      bandas: [{ desde: 5, hasta: 99, label: "fresco", color: "rgba(57,135,229,.08)" }, { desde: -30, hasta: -10, label: "zona productiva", color: "rgba(12,163,12,.09)" },
               { desde: -99, hasta: -30, label: "riesgo", color: "rgba(208,59,59,.10)" }] })}
    <p class="ayuda">Entre −10 y −30 estás asimilando carga; por debajo de −30, riesgo de pasarte. Para competir, llega entre +5 y +15.</p></div>`;

  const B = S.slice(-30), xb = B.map(s => s.d);
  o += `<h2>Bienestar · 30 días</h2><div class="card">
    <div class="sub">HRV (ms) <span class="mut">· línea discontinua = tu media 28 d</span></div>
    ${gLineas({ series: [{ nombre: "HRV", color: COL.s1, v: B.map(s => s.hrv), u: " ms" }], x: xb, fx, alto: 110, grupo: "bien", refs: h.hrv_base ? [{ y: h.hrv_base, label: "media" }] : [] })}
    <div class="sub">Pulso en reposo (ppm)</div>
    ${gLineas({ series: [{ nombre: "Pulso reposo", color: COL.s2, v: B.map(s => s.fc), u: " ppm" }], x: xb, fx, alto: 100, grupo: "bien", refs: h.fc_base ? [{ y: h.fc_base, label: "media" }] : [] })}
    <div class="sub">Sueño (h)</div>
    ${gLineas({ series: [{ nombre: "Sueño", color: COL.s3, v: B.map(s => s.sueno), u: " h" }], x: xb, fx, alto: 100, grupo: "bien", refs: [{ y: 7, label: "7 h" }] })}
  </div>`;

  const sem = p.semanas;
  o += `<h2>Carga semanal · 12 semanas</h2><div class="card">${gBarras({ etiquetas: sem.map(s => fCorta(s.inicio)), valores: sem.map(s => s.tss), unidad: "TSS",
      destacar: sem.length - 1, detalle: sem.map(s => `${s.horas} h · ${s.n} actividades${s.actual ? " · en curso" : ""}`) })}
    <p class="ayuda">La barra discontinua es la semana en curso. Sube la carga de forma gradual (≈ 5-10 % por semana).</p></div>`;

  const z = p.zonas_28d || {}, tot = Object.values(z).reduce((a, b) => a + b, 0);
  let pol = "";
  if (tot) { const baja = ((z.Z1 || 0) + (z.Z2 || 0)) / tot * 100, media = (z.Z3 || 0) / tot * 100, alta = 100 - baja - media;
    pol = `<p class="ayuda">${Math.round(baja)} % suave · ${Math.round(media)} % tempo · ${Math.round(alta)} % intenso. ${baja < 65 ? "Para pruebas largas conviene más volumen en Z1-Z2 (≈ 75-80 %)." : "Buen reparto: base amplia con calidad."}</p>`; }
  o += `<h2>Zonas de potencia · 4 semanas</h2><div class="card">${gZonas(z)}${pol}</div>`;

  if (p.ftp_hist?.length > 1) o += `<h2>FTP estimado</h2><div class="card">${gLineas({ series: [{ nombre: "eFTP", color: COL.s1, v: p.ftp_hist.map(f => f.eftp), u: " W" }],
      x: p.ftp_hist.map(f => f.d), fx, alto: 120, refs: [{ y: p.ftp, label: `FTP actual ${p.ftp} W` }] })}
    ${ult && ult > p.ftp * 1.03 ? `<p class="ayuda">${chipEstado("good", "Mejora")} El estimado (${ult} W) supera tu FTP: plantéate actualizarlo en intervals.icu.</p>` : ""}</div>`;

  if (p.cumplimiento?.length) o += `<h2>Cumplimiento del plan</h2><div class="card">${gBarras({ etiquetas: p.cumplimiento.map(c => fCorta(c.fecha)),
      valores: p.cumplimiento.map(c => c.nota), unidad: "/ 100", color: COL.s3, alto: 110, detalle: p.cumplimiento.map(c => esc(c.titulo)) })}</div>`;
  return o;
}

/* =====================================================================
   VISTA INFORMES: lista + detalle
   ===================================================================== */
const nombreCorto = n => (n.split(/\s+/).find(w => w.length > 2 && !/^(gran|fondo|marcha|carrera|ruta|desafío|the|la|el|los|las)$/i.test(w)) || n).slice(0, 12);
let informeAbierto = null;
function vInformes() {
  if (informeAbierto != null && informes[informeAbierto]) return vInformeDetalle(informes[informeAbierto]);
  let h = `<div class="btns"><button class="b" onclick="cargar()">↻ Actualizar</button><button class="b pri" onclick="lanzarInforme()">🔍 Analizar ya</button></div>
    <p class="mut sm" style="margin:-2px 4px 12px">Se analizan solos cada hora (7-23 h) al subir un entreno de bici.</p>`;
  if (!informes.length) return h + `<div class="card empty">Aún no hay informes.<br>Aparecerán tras tu próximo entreno.</div>`;
  informes.forEach((f, k) => {
    const est = estadoDe(f.nota);
    h += `<div class="card fila" onclick="abrirInforme(${k})">
      ${f.nota != null ? anillo(f.nota, "", est, 58) : `<div class="anillo"><div class="ring libre" style="width:58px;height:58px"><b style="font-size:24px">🚵</b></div></div>`}
      <div class="sp"><div class="ses-date">${f.fecha ? fechaBonita(f.fecha) : ""}</div>
        <div class="ses-title" style="font-size:16px">${esc(f.nombre)}</div>
        <div class="mut sm">${f.duracion_min}' · ${f.tss ? f.tss + " TSS · " : ""}${esc(f.veredicto.replace(/^\S+\s/, ""))}</div></div>
      <span class="mut" style="font-size:22px">›</span></div>`;
  });
  return h;
}
function abrirInforme(k) { informeAbierto = k; pintar(); window.scrollTo(0, 0); }
function cerrarInforme() { informeAbierto = null; pintar(); }

function vInformeDetalle(f) {
  const ftp = f.ftp || 200;
  let o = `<button class="lnk" onclick="cerrarInforme()">‹ Todos los informes</button>
  <div class="card">
    <div class="ses-date">${f.fecha ? fechaBonita(f.fecha) : ""} · ${hms(f.duracion_min * 60)}</div>
    <div class="ses-title">${esc(f.nombre)}</div>
    <div class="mut sm">${f.planificado ? "Plan: " + esc(f.planificado) : "Salida libre (no planificada)"}</div>
    <div class="veredicto">${esc(f.veredicto)}</div>
    <div class="anillos">${Object.entries(f.puntuaciones || {}).map(([k, v]) => anillo(v, k, estadoDe(v), 84)).join("")}</div>
  </div>
  <div class="chips c4">
    ${[["TSS", f.tss], ["NP", f.np && f.np + " W"], ["IF", f.if], ["FC media", f.fc_media]].map(([k, v]) => `<div class="chip"><b>${v ?? "–"}</b><span>${k}</span></div>`).join("")}
  </div>`;

  if (f.comparacion) { const c = f.comparacion, est = c.dif > 0 ? "good" : c.dif < -3 ? "warning" : "s1";
    o += `<div class="card comp"><div class="mut sm">Comparado con la misma sesión del ${fCorta(c.fecha)}</div>
      <div class="row"><div class="big">${c.dif > 0 ? "+" : ""}${c.dif} W</div><div class="mut sm sp">media de los bloques de trabajo<br>${c.antes} W → <b style="color:var(--tx)">${c.ahora} W</b></div>
      ${c.dif !== 0 ? chipEstado(est === "s1" ? "good" : est, c.dif > 0 ? "Progresas" : "Algo por debajo") : ""}</div></div>`; }

  if (f.serie && f.serie.w) {
    const S = f.serie, t = S.w.map((_, i) => i * S.paso_s), fx = s => hms(s);
    const bandas = [[0, 55, "Z1"], [55, 75, "Z2"], [75, 90, "Z3"], [90, 105, "Z4"], [105, 120, "Z5"], [120, 400, "Z6+"]]
      .map(([a, b, z]) => ({ desde: a * ftp / 100, hasta: b * ftp / 100, label: z, color: ["Z2", "Z4", "Z6+"].includes(z) ? "rgba(255,255,255,.035)" : "rgba(0,0,0,0)" }));
    const maxW = Math.max(...S.w.filter(v => v != null));
    o += `<h2>Potencia, pulso y cadencia</h2><div class="card">
      <div class="sub">Potencia (W) <span class="mut">· franjas = zonas · línea = FTP ${ftp} W</span></div>
      ${gLineas({ series: [{ nombre: "Potencia", color: COL.s1, v: S.w, u: " W" }], x: t, fx, alto: 170, grupo: "act", yMin: 0, yMax: Math.max(maxW * 1.05, ftp * 1.2), bandas, refs: [{ y: ftp, label: "FTP" }], relleno: true })}
      ${S.hr ? `<div class="sub">Pulso (ppm)</div>${gLineas({ series: [{ nombre: "Pulso", color: COL.s2, v: S.hr, u: " ppm" }], x: t, fx, alto: 110, grupo: "act" })}` : ""}
      ${S.cad ? `<div class="sub">Cadencia (rpm)</div>${gLineas({ series: [{ nombre: "Cadencia", color: COL.s3, v: S.cad, u: " rpm" }], x: t, fx, alto: 90, grupo: "act" })}` : ""}
      <p class="ayuda">Desliza el dedo sobre cualquier gráfico: las tres líneas se sincronizan.</p></div>`;
  }

  if (f.intervalos?.length) {
    const nums = f.intervalos.flatMap(i => [parseInt(i.real) || 0, ...(i.obj.match(/\d+/g) || []).map(Number)]);
    const max = Math.max(...nums) * 1.08, min = Math.min(...nums.filter(Boolean)) * 0.85;
    const pct = v => ((v - min) / (max - min) * 100).toFixed(1);
    const EST = { ok: ["good", "En objetivo"], alto: ["serious", "Por encima"], bajo: ["warning", "Por debajo"], "no hecho": ["critical", "No hecho"] };
    o += `<h2>Bloques de trabajo</h2><div class="card">${f.intervalos.map(i => {
      const [lo, hi] = (i.obj.match(/\d+/g) || []).map(Number), real = parseInt(i.real) || null, [e, txt] = EST[i.estado];
      return `<div class="bul"><div class="row"><b>Bloque ${i.n}</b><span class="mut sm">${hms(i.dur_obj)} · obj. ${esc(i.obj)}</span><span class="sp"></span>${chipEstado(e, txt)}</div>
        <div class="pista"><i class="obj" style="left:${pct(lo)}%;width:${Math.max(1.5, pct(hi ?? lo) - pct(lo))}%"></i>
        ${real ? `<i class="real" style="width:${pct(real)}%;background:${COL[e]}"></i>` : ""}</div>
        <div class="row sm"><span><b>${real ? real + " W" : "—"}</b></span>${i.fc ? `<span class="mut">${i.fc} ppm</span>` : ""}${i.cad ? `<span class="mut">${Math.round(i.cad)} rpm</span>` : ""}</div></div>`;
    }).join("")}<p class="ayuda">La franja gris es el objetivo; la barra, lo que hiciste.</p></div>`;
  }

  if (f.mantenimiento != null) { const r = f.mantenimiento, e = r >= 95 ? "good" : r >= 88 ? "warning" : "critical";
    o += `<h2>Aguante en la 2ª mitad</h2><div class="card"><div class="row"><div class="big">${r} %</div><div class="sp mut sm">de la potencia de la 1ª mitad que mantuviste en la 2ª</div>${chipEstado(e, r >= 95 ? "Muy bien" : r >= 88 ? "Aceptable" : "Bajón")}</div></div>`; }

  if (f.zonas && Object.keys(f.zonas).length) o += `<h2>Tiempo en zonas</h2><div class="card">${gZonas(f.zonas)}</div>`;

  if (f.decoupling != null) { const d = f.decoupling, e = d <= 5 ? "good" : d <= 8 ? "warning" : "critical";
    o += `<h2>Resistencia aeróbica</h2><div class="card"><div class="row"><div class="big">${d} %</div><div class="sp mut sm">deriva cardíaca (decoupling): cuánto sube el pulso respecto a la potencia de la 1ª a la 2ª mitad.</div>${chipEstado(e, d <= 5 ? "Buena" : d <= 8 ? "Mejorable" : "Alta")}</div>
      <div class="pista" style="margin-top:10px"><i class="obj" style="left:0;width:${5 / 12 * 100}%;background:rgba(12,163,12,.25)"></i><i class="real" style="width:${Math.min(100, d / 12 * 100)}%;background:${COL[e]}"></i></div>
      <div class="row mut sm"><span>0 %</span><span class="sp"></span><span>5 % · límite recomendado</span><span class="sp"></span><span>12 %</span></div></div>`; }

  if (f.logros?.length) o += `<h2>Lo mejor</h2><div class="card"><ul class="lista ok">${f.logros.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  if (f.mejoras?.length) o += `<h2>A mejorar</h2><div class="card"><ul class="lista mej">${f.mejoras.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  if (f.proxima) o += `<div class="card proxima"><b>Para la próxima</b><div>${esc(f.proxima)}</div></div>`;
  return o;
}
