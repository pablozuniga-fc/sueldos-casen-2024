/* Tablero de la tesis: conecta los datos agregados (datos/datos.js), las distribuciones (modelo.js) y los gráficos (graficos.js). */
(function () {
  'use strict';
  var D = window.DATOS, MOD = window.Modelo, M = MOD.crear(D.modelo), G = window.Graf, F4 = D.fase4;
  var C1 = '#E77500', C2 = '#498BCA', GRIS = '#394049', BARRA = '#C3CAD1', TENUE = '#7C8792';
  var MILLON = 1e6, NIV = F4.niveles;

  /* ---------- formatos (es-CL: punto de miles y coma decimal) ---------- */
  function nf(d) { return new Intl.NumberFormat('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  var f0 = nf(0);
  function num(v, d) { return (v < 0 ? '−' : '') + nf(d == null ? 0 : d).format(Math.abs(v)); }
  function pesos(v) { return (v < 0 ? '−$' : '$') + f0.format(Math.abs(Math.round(v))); }
  function pesosMil(v) { return pesos(Math.round(v / 1000) * 1000); }
  function corto(v) {
    var a = Math.abs(v), sg = v < 0 ? '−' : '';
    if (a === 0) return '$0';
    if (a >= MILLON) return sg + '$' + nf(a % MILLON === 0 ? 0 : 1).format(a / MILLON) + ' M';
    return sg + '$' + f0.format(a / 1000) + ' mil';
  }
  function pct(v, d) { return num(v, d == null ? 1 : d) + ' %'; }
  function $(id) { return document.getElementById(id); }
  function crear(tag, clase, texto) { var e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; }
  function techo(v, paso) { return Math.ceil(v / paso - 1e-9) * paso; }
  function radio(nombre, fn) {
    document.querySelectorAll('input[name="' + nombre + '"]').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) fn(r.value); }); });
  }
  /* tabla HTML: cols = [texto], filas = [[celdas]], la primera columna es encabezado de fila */
  function tablaEn(cont, cols, filas, claseFila, clase) {
    cont.textContent = '';
    var t = crear('table', 'tabla' + (clase ? ' ' + clase : '')), th = crear('thead'), tr = crear('tr');
    cols.forEach(function (c, i) { var e = crear('th', i ? 'num' : '', c); e.setAttribute('scope', 'col'); tr.appendChild(e); });
    th.appendChild(tr); t.appendChild(th);
    var tb = crear('tbody');
    filas.forEach(function (f, k) {
      var r = crear('tr', claseFila ? claseFila(k) : '');
      f.forEach(function (c, i) {
        var celda = crear(i ? 'td' : 'th', i ? 'num' : '');
        if (c && typeof c === 'object') { celda.textContent = c.t; if (c.fuerte) celda.classList.add('fuerte'); if (c.izq) celda.classList.remove('num'); }
        else celda.textContent = c;
        r.appendChild(celda);
      });
      tb.appendChild(r);
    });
    t.appendChild(tb); cont.appendChild(t);
  }
  function figuraMini(cont, titulo) {
    var fg = crear('figure', 'fig mini'), cap = crear('figcaption');
    cap.appendChild(crear('h4', '', titulo)); fg.appendChild(cap);
    fg.appendChild(crear('div', 'fig-plot'));
    cont.appendChild(fg);
    return fg;
  }

  /* ---------- pestañas ---------- */
  var vistas = {}, activa = 'presentacion';
  function registrar(id, fn) { (vistas[id] = vistas[id] || []).push(fn); }
  function dibujar(id) { (vistas[id] || []).forEach(function (fn) { fn(); }); }
  function mostrar(id, sinHistorial) {
    if (!$('sec-' + id)) id = 'presentacion';
    activa = id;
    document.querySelectorAll('.seccion').forEach(function (sec) { sec.hidden = sec.id !== 'sec-' + id; });
    document.querySelectorAll('.pestana').forEach(function (b) {
      var sel = b.dataset.ir === id;
      b.setAttribute('aria-selected', sel ? 'true' : 'false');
      if (sel && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    G.ocultarTip();
    dibujar(id);
    if (!sinHistorial) history.replaceState(null, '', '#' + id);
  }
  document.querySelectorAll('.pestana').forEach(function (b) {
    b.addEventListener('click', function () { mostrar(b.dataset.ir); window.scrollTo({ top: 0 }); });
  });
  var espera = null;
  window.addEventListener('resize', function () { clearTimeout(espera); espera = setTimeout(function () { dibujar(activa); }, 120); });
  window.addEventListener('hashchange', function () { mostrar(location.hash.slice(1), true); });

  /* ---------- modelos de la extensión: un objeto Modelo por modelo y nivel ---------- */
  var cache = {};
  function modeloDe(K, k) {
    var id = K + '|' + k;
    if (!cache[id]) {
      var p = F4.modelos[K];
      cache[id] = MOD.crear({ intercepto: p.intercepto, nivel: p.nivel, edad: p.edad, horas: p.horas, hombre: p.hombre, tam: p.tam, sigma2: p.sigma2[k], alpha: p.alpha[k], nu: p.nu });
    }
    return cache[id];
  }
  function filaComp(K) { return F4.comparacion.filter(function (c) { return c.modelo === K; })[0]; }
  var NOMBRE_MOD = { M0: 'M0: escala y asimetría comunes', M1: 'M1: escala por nivel', M2: 'M2: asimetría por nivel', M3: 'M3: escala y asimetría por nivel' };

  /* ---------- cifras en el texto ---------- */
  var total = D.hist.grupos.total, um = M.umbralPeso();
  var n3 = F4.nivel.M3, rz3 = F4.centro.M3.map(function (c) { return c.razon; });
  var valores = {
    n: f0.format(D.meta.n), frecuente: pesos(D.frecuentes[0].monto), frecuente_pct: pct(D.frecuentes[0].pct),
    mediana: pesos(D.sueldo.mediana * MILLON), media: pesos(D.sueldo.media * MILLON),
    asimetria: num(D.sueldo.asimetria, 3), curtosis: num(D.sueldo.curtosis, 3),
    mayor_total: pct(100 * total.mayor / total.n),
    m10: pct(D.redondeo.m10), m50: pct(D.redondeo.m50), m100: pct(D.redondeo.m100), distintos: f0.format(D.redondeo.distintos),
    peso_max: num(M.peso(0), 2), umbral_izq: pesos(Math.round(-um.izq * 10000) * 100), umbral_der: pesos(Math.round(um.der * 10000) * 100),
    pct_bajo_total: pct(D.pesos_nivel[D.pesos_nivel.length - 1].pct_bajo),
    fd: pesos(D.hist_fino.fd * MILLON),
    x_bic0: num(filaComp('M0').bic, 2), x_bic1: num(filaComp('M1').bic, 2), x_bic3: num(filaComp('M3').bic, 2),
    x_nu0: num(filaComp('M0').nu, 3), x_nu3: num(filaComp('M3').nu, 3),
    x_der_bas: pesosMil(n3[0].esc_der * MILLON), x_der_pro: pesosMil(n3[5].esc_der * MILLON), x_pb_pro: pct(100 * n3[5].p_bajo),
    x_rz_min: num(Math.min.apply(null, rz3), 2), x_rz_max: num(Math.max.apply(null, rz3), 2)
  };
  document.querySelectorAll('[data-v]').forEach(function (e) { if (valores[e.dataset.v] != null) e.textContent = valores[e.dataset.v]; });

  /* ---------- histograma del sueldo ---------- */
  var centros = D.hist.centros, ancho = D.hist.ancho;
  function porcentajes(g) { return g.c.map(function (c, i) { return [centros[i], 100 * c / g.n]; }); }
  function tramo(x) { return x === 0 ? 'Menos de $25.000' : 'De ' + pesos(x - ancho / 2) + ' a ' + pesos(x + ancho / 2 - 1); }
  var ejeSueldo = { min: -ancho / 2, max: centros[centros.length - 1] + ancho / 2, fmt: corto, titulo: 'Sueldo líquido mensual', marcas: [0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000] };

  /* ============================ PRESENTACIÓN ============================ */
  registrar('presentacion', function () {
    var pts = porcentajes(total), ymax = techo(Math.max.apply(null, pts.map(function (p) { return p[1]; })), 5);
    G.xy($('fig-apertura'), {
      alto: 330, descripcion: 'Histograma del sueldo líquido mensual de la muestra',
      x: ejeSueldo, y: { min: 0, max: ymax, fmt: function (v) { return f0.format(v) + ' %'; } },
      capas: [{ tipo: 'barras', puntos: pts, ancho: ancho, color: C1 }],
      marcasX: [
        { x: D.frecuentes[0].monto, texto: 'Más frecuente: ' + pesos(D.frecuentes[0].monto), nivel: 0, color: GRIS },
        { x: D.sueldo.mediana * MILLON, texto: 'Mediana: ' + pesos(D.sueldo.mediana * MILLON), nivel: 1, color: GRIS },
        { x: D.sueldo.media * MILLON, texto: 'Media: ' + pesos(D.sueldo.media * MILLON), nivel: 2, color: GRIS }
      ],
      puntosX: centros,
      lectura: function (x, i) { return { titulo: tramo(x), filas: [{ color: C1, valor: pct(pts[i][1]), nombre: 'de la muestra' }], nota: f0.format(total.c[i]) + ' personas' }; },
      tabla: { cols: ['Tramo de sueldo', '% de la muestra', 'Personas'], filas: pts.map(function (p, i) { return [tramo(p[0]), pct(p[1]), f0.format(total.c[i])]; }) }
    });
  });

  function dibujarDosPiezas() {
    var a = +$('dp-alpha').value, nu = +$('dp-nu').value, xs = [], tp = [], no = [];
    for (var i = -400; i <= 600; i++) {
      var x = i / 100; xs.push(x);
      tp.push([x, MOD.densidadError('T', x, 1, a, nu)]);
      no.push([x, MOD.densidadSMN('N', x)]);
    }
    $('dp-alpha-out').textContent = num(a, 2); $('dp-nu-out').textContent = num(nu, 2);
    G.xy($('fig-dospiezas'), {
      alto: 300, descripcion: 'Densidad t de dos piezas para los valores elegidos de asimetría y colas',
      x: { min: -4, max: 6, fmt: function (v) { return num(v, 0); }, titulo: 'Error (en unidades de la escala σ)', marcas: [-4, -2, 0, 2, 4, 6] },
      y: { min: 0, max: 0.46, sinEtiquetas: true, marcas: [0] },
      capas: [{ tipo: 'linea', area: true, color: C1, nombre: 't de dos piezas', puntos: tp }, { tipo: 'linea', color: TENUE, nombre: 'Normal estándar', puntos: no, trazo: '4 4', grosor: 1.5 }],
      marcasX: [{ x: 0, texto: 'Moda', nivel: 0, color: GRIS }],
      puntosX: xs, inicioTeclado: 400,
      lectura: function (xv, i) { return { titulo: 'Error = ' + num(xv, 2), filas: [{ color: C1, valor: num(tp[i][1], 3), nombre: 'densidad t de dos piezas' }, { color: TENUE, valor: num(no[i][1], 3), nombre: 'densidad normal' }] }; }
    });
    var cola = (1 - a) * MOD.acumuladaT(3 / (1 - a), nu, true);
    $('dp-lectura').textContent = 'Proporción bajo la moda, (1 + α)/2: ' + pct(50 * (1 + a)) + '. Escala bajo la moda: ' + num(1 + a, 2) + ' σ; sobre la moda: ' + num(1 - a, 2) +
      ' σ. Probabilidad de un error mayor que 3σ: ' + pct(100 * cola, 2) + ' (en la normal estándar, 0,13 %).';
  }
  $('dp-alpha').addEventListener('input', dibujarDosPiezas);
  $('dp-nu').addEventListener('input', dibujarDosPiezas);
  $('dp-estimado').addEventListener('click', function () { $('dp-alpha').value = D.modelo.alpha.toFixed(2); $('dp-nu').value = D.modelo.nu.toFixed(2); dibujarDosPiezas(); });
  registrar('presentacion', dibujarDosPiezas);

  /* ============================ ANÁLISIS DESCRIPTIVO ============================ */
  (function flujo() {
    var t = crear('table', 'tabla flujo'), tb = crear('tbody'), n0 = D.flujo[0].n;
    var th = crear('thead'), tr = crear('tr');
    ['Paso', 'Criterio', 'Personas', ''].forEach(function (c, i) { var e = crear('th', i === 2 ? 'num' : '', c); e.setAttribute('scope', 'col'); tr.appendChild(e); });
    th.appendChild(tr); t.appendChild(th);
    D.flujo.forEach(function (f) {
      var r = crear('tr');
      r.appendChild(crear('td', 'num', String(f.paso)));
      r.appendChild(crear('th', '', f.criterio.replace(/\s*\([^)]*\)/g, '')));
      r.appendChild(crear('td', 'num', f0.format(f.n)));
      var c = crear('td', 'barra'), b = crear('div', 'b'); b.style.width = (100 * f.n / n0) + '%'; c.appendChild(b); r.appendChild(c);
      tb.appendChild(r);
    });
    t.appendChild(tb); $('flujo').appendChild(t);
  })();

  var dims = [['nivel', 'Nivel educacional'], ['sexo', 'Sexo'], ['tam', 'Tamaño de empresa']];
  function nombreGrupo(k) { return k === 'total' ? 'Toda la muestra' : k.split('|')[1]; }
  function opciones(sel, primera) {
    sel.appendChild(new Option(primera[1], primera[0]));
    dims.forEach(function (d) {
      var og = document.createElement('optgroup'); og.label = d[1];
      D.categorias.filter(function (c) { return c.variable === d[1]; }).forEach(function (c) { og.appendChild(new Option(c.categoria, d[0] + '|' + c.categoria)); });
      sel.appendChild(og);
    });
  }
  opciones($('sel-grupo'), ['total', 'Toda la muestra']);
  opciones($('sel-comparar'), ['', 'Sin comparación']);
  $('sel-comparar').insertBefore(new Option('Toda la muestra', 'total'), $('sel-comparar').children[1]);
  function resumenGrupo(k) {
    if (k === 'total') return { n: D.meta.n, media: D.sueldo.media, mediana: D.sueldo.mediana, de: D.sueldo.de };
    var c = D.categorias.filter(function (x) { return x.categoria === k.split('|')[1]; })[0];
    return { n: c.n, media: c.media, mediana: c.mediana, de: c.de };
  }
  function dibujarHist() {
    var a = $('sel-grupo').value, b = $('sel-comparar').value;
    if (b === a) b = '';
    var ga = D.hist.grupos[a], gb = b ? D.hist.grupos[b] : null, pa = porcentajes(ga), pb = gb ? porcentajes(gb) : null;
    var maxy = Math.max.apply(null, pa.concat(pb || []).map(function (p) { return p[1]; }));
    var capas = [{ tipo: 'barras', puntos: pa, ancho: ancho, color: C1, nombre: nombreGrupo(a) }];
    if (pb) capas.push({ tipo: 'escalon', puntos: pb, ancho: ancho, color: C2, nombre: nombreGrupo(b) });
    G.xy($('fig-hist'), {
      alto: 340, descripcion: 'Histograma del sueldo por grupo',
      x: ejeSueldo, y: { min: 0, max: techo(maxy, maxy > 20 ? 10 : 5), fmt: function (v) { return f0.format(v) + ' %'; } },
      capas: capas, puntosX: centros,
      lectura: function (x, i) {
        var filas = [{ color: C1, valor: pct(pa[i][1]), nombre: nombreGrupo(a) }];
        if (pb) filas.push({ color: C2, valor: pct(pb[i][1]), nombre: nombreGrupo(b) });
        return { titulo: tramo(x), filas: filas };
      },
      tabla: { cols: ['Tramo de sueldo', nombreGrupo(a) + ' (%)'].concat(pb ? [nombreGrupo(b) + ' (%)'] : []),
        filas: pa.map(function (p, i) { return [tramo(p[0]), pct(p[1])].concat(pb ? [pct(pb[i][1])] : []); }) }
    });
    var nota = 'Sobre $3.025.000, fuera del gráfico: ' + pct(100 * ga.mayor / ga.n) + ' de ' + nombreGrupo(a).toLowerCase();
    if (gb) nota += ' y ' + pct(100 * gb.mayor / gb.n) + ' de ' + nombreGrupo(b).toLowerCase();
    $('nota-hist').textContent = nota + '.';
    var cont = $('resumen-grupos'); cont.textContent = '';
    cont.appendChild(crear('h3', '', 'Medidas de resumen del sueldo'));
    var caja = crear('div', 'tabla-ancha'); cont.appendChild(caja);
    tablaEn(caja, ['Grupo', 'Personas', 'Media', 'Mediana', 'Desviación estándar'], [a].concat(b ? [b] : []).map(function (k) {
      var r = resumenGrupo(k);
      return [nombreGrupo(k), f0.format(r.n), pesosMil(r.media * MILLON), pesosMil(r.mediana * MILLON), pesosMil(r.de * MILLON)];
    }));
  }
  $('sel-grupo').addEventListener('change', dibujarHist);
  $('sel-comparar').addEventListener('change', dibujarHist);
  registrar('descriptivo', dibujarHist);

  registrar('descriptivo', function () {
    G.filas($('fig-frecuentes'), {
      tipo: 'barra', color: C1, anchoEtiqueta: 96, descripcion: 'Los diez sueldos más declarados',
      filas: D.frecuentes.map(function (f) { return { etiqueta: pesos(f.monto), valor: f.pct, n: f.n }; }),
      x: { min: 0, max: 25, fmt: function (v) { return f0.format(v) + ' %'; } },
      etiquetaValor: function (f) { return pct(f.valor); },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: pct(f.valor), nombre: 'de la muestra' }], nota: f0.format(f.n) + ' personas' }; },
      tabla: { cols: ['Sueldo declarado', '% de la muestra', 'Personas'], filas: D.frecuentes.map(function (f) { return [pesos(f.monto), pct(f.pct), f0.format(f.n)]; }) }
    });
  });

  var maxPerfil = 0;
  ['esc', 'edad', 'horas'].forEach(function (v) { D.perfiles[v].forEach(function (p) { maxPerfil = Math.max(maxPerfil, p.media, p.mediana); }); });
  function dibujarPerfil(fig, clave, titulo, sufijo) {
    var datos = D.perfiles[clave], xs = datos.map(function (p) { return p.x; });
    G.xy($(fig), {
      alto: 280, margenDer: 16, descripcion: 'Sueldo medio y mediano según ' + titulo.toLowerCase(),
      x: { min: xs[0], max: xs[xs.length - 1], fmt: function (v) { return f0.format(v); }, titulo: titulo },
      y: { min: 0, max: techo(maxPerfil * MILLON, 500000), fmt: corto },
      capas: [
        { tipo: 'linea', nombre: 'Media', color: C1, puntos: datos.map(function (p) { return [p.x, p.media * MILLON]; }) },
        { tipo: 'linea', nombre: 'Mediana', color: C2, puntos: datos.map(function (p) { return [p.x, p.mediana * MILLON]; }) }
      ],
      esquina: 'ρ de Spearman = ' + num(D.spearman[clave], 3),
      puntosX: xs,
      lectura: function (x, i) {
        return { titulo: f0.format(x) + ' ' + sufijo, filas: [{ color: C1, valor: pesosMil(datos[i].media * MILLON), nombre: 'media' }, { color: C2, valor: pesosMil(datos[i].mediana * MILLON), nombre: 'mediana' }], nota: f0.format(datos[i].n) + ' personas' };
      },
      tabla: { cols: [titulo, 'Personas', 'Media', 'Mediana'], filas: datos.map(function (p) { return [f0.format(p.x), f0.format(p.n), pesosMil(p.media * MILLON), pesosMil(p.mediana * MILLON)]; }) }
    });
  }
  registrar('descriptivo', function () { dibujarPerfil('fig-perfil-esc', 'esc', 'Años de escolaridad', 'años de escolaridad'); });
  registrar('descriptivo', function () { dibujarPerfil('fig-perfil-edad', 'edad', 'Edad (años)', 'años'); });
  registrar('descriptivo', function () { dibujarPerfil('fig-perfil-horas', 'horas', 'Horas semanales', 'horas semanales'); });

  registrar('descriptivo', function () {
    var filas = D.cajas.map(function (c) {
      return { grupo: c.variable, etiqueta: c.categoria, p10: c.p10 * MILLON, p25: c.p25 * MILLON, p50: c.p50 * MILLON, p75: c.p75 * MILLON, p90: c.p90 * MILLON, n: c.n };
    });
    var xmax = techo(Math.max.apply(null, filas.map(function (f) { return f.p90; })), 500000);
    G.filas($('fig-cajas'), {
      tipo: 'caja', color: C1, anchoEtiqueta: 170, margenDer: 20, altoFila: 32, descripcion: 'Percentiles del sueldo según variables categóricas',
      filas: filas, x: { min: 0, max: xmax, fmt: corto, titulo: 'Sueldo líquido mensual' },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: pesosMil(f.p50), nombre: 'mediana' }, { valor: pesosMil(f.p25) + ' a ' + pesosMil(f.p75), nombre: 'percentiles 25 a 75' }, { valor: pesosMil(f.p10) + ' a ' + pesosMil(f.p90), nombre: 'percentiles 10 a 90' }], nota: f0.format(f.n) + ' personas' }; },
      tabla: { cols: ['Categoría', 'Personas', 'Percentil 10', 'Percentil 25', 'Mediana', 'Percentil 75', 'Percentil 90'], filas: filas.map(function (f) { return [f.etiqueta, f0.format(f.n), pesosMil(f.p10), pesosMil(f.p25), pesosMil(f.p50), pesosMil(f.p75), pesosMil(f.p90)]; }) }
    });
  });

  /* ============================ HISTOGRAMAS DE RESIDUOS ============================ */
  var HF = D.hist_fino, KS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100], K_FD = 7;
  var VENT = { amplia: [-0.75, 3.4], centro: [-0.4, 1.0] };
  function anchoTexto(k) { return pesos(k * HF.base * MILLON) + (k === 9 ? ' (Freedman-Diaconis)' : ''); }
  /* agrupa los tramos finos (anclados en cero) de k en k: devuelve [x0, x1, densidad] */
  function agrupar(h, k, nTot, base, i0) {
    var w = k * base, out = {}, orden = [];
    for (var j = 0; j < h.length; j++) {
      var g = Math.floor((i0 + j) / k);
      if (out[g] == null) { out[g] = 0; orden.push(g); }
      out[g] += h[j];
    }
    return orden.map(function (g) { return [g * w, (g + 1) * w, out[g] / (nTot * w)]; });
  }
  function curva(fn, lim, pasos) {
    var pts = [], d = (lim[1] - lim[0]) / pasos, cero = false;
    for (var i = 0; i <= pasos; i++) {
      var x = lim[0] + i * d;
      if (!cero && x > 0) { pts.push([0, fn(0)]); pts.push([1e-9, fn(1e-9)]); cero = true; }
      pts.push([x, fn(x)]);
    }
    return pts;
  }
  function maxVentana(barras, cur, lim) {
    var m = 0;
    barras.forEach(function (b) { if (b[1] > lim[0] && b[0] < lim[1]) m = Math.max(m, b[2]); });
    cur.forEach(function (p) { m = Math.max(m, p[1]); });
    return m;
  }
  function panelResiduos(fig, barras, cur, lim, ymax, o) {
    var visibles = barras.filter(function (b) { return b[1] > lim[0] && b[0] < lim[1]; });
    G.xy(fig, {
      alto: o.alto || 190, descripcion: o.descripcion, margen: { l: 34, r: 8, b: o.tituloX ? 40 : 24 },
      x: { min: lim[0], max: lim[1], fmt: function (v) { return num(v, Math.abs(lim[1] - lim[0]) < 1 ? 2 : 1); }, titulo: o.tituloX || null, marcas: o.marcasX || null },
      y: { min: 0, max: ymax, fmt: function (v) { return num(v, ymax < 2 ? 1 : 0); } },
      capas: [{ tipo: 'hist', puntos: visibles, color: BARRA }, { tipo: 'linea', color: o.color || C1, puntos: cur, grosor: 2 }],
      marcasX: [{ x: 0, color: TENUE }],
      esquina: o.esquina, esquina2: o.esquina2,
      puntosX: visibles.map(function (b) { return (b[0] + b[1]) / 2; }),
      lectura: function (xv, i) {
        var b = visibles[i];
        return { titulo: 'Residuo de ' + pesos(b[0] * MILLON) + ' a ' + pesos(b[1] * MILLON), filas: [{ color: BARRA, valor: num(b[2], 3), nombre: 'densidad observada' }, { color: o.color || C1, valor: num(o.fn(xv), 3), nombre: 'densidad ajustada' }] };
      }
    });
  }

  /* ============================ COMPARACIÓN DE MODELOS ============================ */
  var esp = 'B', cmpK = K_FD, cmpVent = 'amplia';
  function modelosDe(e) { return D.modelos20.filter(function (m) { return m.esp === e; }); }
  function densidad20(m) { return function (r) { return MOD.densidadError(m.fam, r, m.sigma, m.alpha, m.nu, m.tau); }; }
  function tablaComparacion() {
    var ms = modelosDe(esp), minBic = Math.min.apply(null, ms.map(function (m) { return m.bic; }));
    tablaEn($('tabla-comparacion'), ['Distribución', 'Versión', 'm', 'ℓ', 'AIC', 'BIC', 'σ', 'α', 'ν', 'Bajo la moda: modelo', 'observado'], ms.map(function (m) {
      var fam = D.familias.filter(function (f) { return f.clave === m.fam; })[0].nombre;
      var nu = m.nu == null ? '' : (m.tau == null ? num(m.nu, 3) : num(m.nu, 3) + '; τ = ' + num(m.tau, 3));
      return [fam + (m.sel ? ' (modelo seleccionado)' : ''), { t: m.tipo === 'TP' ? 'Dos piezas' : 'Simétrica', izq: true }, String(m.m), num(m.loglik, 2), num(m.aic, 2), { t: num(m.bic, 2), fuerte: m.bic === minBic },
        num(m.sigma, 4), m.tipo === 'TP' ? num(m.alpha, 3) : '0', nu, pct(100 * m.prop_bajo), pct(100 * m.prop_obs)];
    }), function (k) { return ms[k].sel ? 'elegido' : (ms[k].tipo === 'TP' ? 'par-tp' : ''); }, 'compacta');
  }
  function figBic() {
    var ms = modelosDe(esp), filas = D.familias.map(function (f) {
      var s = ms.filter(function (m) { return m.fam === f.clave && m.tipo === 'SMN'; })[0], t = ms.filter(function (m) { return m.fam === f.clave && m.tipo === 'TP'; })[0];
      return { etiqueta: f.nombre, valores: [s.bic, t.bic], s: s, t: t };
    });
    G.filas($('fig-bic'), {
      tipo: 'barra', anchoEtiqueta: 150, margenDer: 24, descripcion: 'BIC de los modelos simétricos y de dos piezas',
      series: [{ nombre: 'Simétrica (SMN)', color: C2 }, { nombre: 'Dos piezas (TP-SMN)', color: C1 }],
      filas: filas, x: { min: 0, max: 100000, fmt: function (v) { return f0.format(v); }, titulo: 'BIC (menor es mejor)' },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C2, valor: num(f.valores[0], 2), nombre: 'BIC simétrica' }, { color: C1, valor: num(f.valores[1], 2), nombre: 'BIC dos piezas' }], nota: 'Diferencia: ' + num(f.valores[0] - f.valores[1], 2) }; },
      tabla: { cols: ['Distribución', 'BIC simétrica', 'BIC dos piezas', 'Diferencia'], filas: filas.map(function (f) { return [f.etiqueta, num(f.valores[0], 2), num(f.valores[1], 2), num(f.valores[0] - f.valores[1], 2)]; }) }
    });
  }
  var figsModelos = null;
  function panelModelos() {
    var cont = $('panel-modelos'), ms = modelosDe(esp), lim = VENT[cmpVent], k = KS[cmpK];
    if (!figsModelos) {
      figsModelos = {};
      D.familias.forEach(function (f) { ['SMN', 'TP'].forEach(function (t) { figsModelos[f.clave + t] = figuraMini(cont, ''); }); });
    }
    var prep = ms.map(function (m) {
      var fn = densidad20(m), barras = agrupar(m.h.c, k, D.meta.n, HF.base, HF.i0), cur = curva(fn, lim, 260);
      return { m: m, fn: fn, barras: barras, cur: cur, max: maxVentana(barras, cur, lim) };
    });
    var ymax = Math.max.apply(null, prep.map(function (p) { return p.max; })) * 1.04;
    prep.forEach(function (p, idx) {
      var m = p.m, fig = figsModelos[m.fam + m.tipo], fam = D.familias.filter(function (f) { return f.clave === m.fam; })[0].nombre;
      fig.querySelector('h4').textContent = fam + ' · ' + (m.tipo === 'TP' ? 'dos piezas' : 'simétrica') + (m.sel ? ' · modelo seleccionado' : '');
      fig.classList.toggle('destacada', !!m.sel);
      panelResiduos(fig, p.barras, p.cur, lim, ymax, { fn: p.fn, color: m.tipo === 'TP' ? C1 : C2, esquina: 'BIC ' + num(m.bic, 0),
        tituloX: idx >= 8 ? 'Residuo (millones de pesos)' : null, descripcion: 'Residuos y densidad ajustada: ' + fam + ', ' + m.tipo });
    });
    $('cmp-ancho-out').textContent = anchoTexto(k);
    $('cmp-nota').textContent = 'Con ' + pesos(k * HF.base * MILLON) + ' por barra hay ' + f0.format(Math.round((lim[1] - lim[0]) / (k * HF.base))) + ' barras en la ventana. Los diez paneles usan los mismos ejes. Cambiar el ancho no modifica el ajuste: una barra más ancha promedia más observaciones.';
  }
  function dibujarComparacion() { tablaComparacion(); figBic(); panelModelos(); }
  radio('esp', function (v) { esp = v; dibujarComparacion(); });
  radio('vent', function (v) { cmpVent = v; panelModelos(); });
  $('cmp-ancho').addEventListener('input', function (ev) { cmpK = +ev.target.value; panelModelos(); });
  $('cmp-fd').addEventListener('click', function () { cmpK = K_FD; $('cmp-ancho').value = K_FD; panelModelos(); });
  registrar('comparacion', dibujarComparacion);
  (function tablaModelos() {
    var bic = {}; D.ajuste.forEach(function (a) { bic[a.modelo] = a.bic; });
    tablaEn($('tabla-modelos'), ['Modelo', 'BIC', 'Asimetría', 'Curtosis', '|Residuo| > 2', '|Residuo| > 3'], D.residuos_modelo.map(function (r) {
      var nombre = r.modelo.replace(' (MCO)', ''), b = bic[nombre];
      var etiqueta = r.modelo === 'TP-t' ? 'TP-t (modelo seleccionado)' : r.modelo.replace('Referencia N(0, 1)', 'Referencia: normal estándar');
      return [etiqueta, b ? num(b, 0) : '', num(r.asimetria, 3), num(r.curtosis, 3), pct(r.pct2, 2), pct(r.pct3, 2)];
    }), function (k) { return D.residuos_modelo[k].modelo === 'TP-t' ? 'elegido' : ''; }, 'compacta');
  })();

  /* ============================ DISTRIBUCIÓN CONDICIONAL ============================ */
  var perfiles = {
    a: { nivel: 'Media completa', edad: 40, horas: 44, sexo: 'Mujer', tam: 'Micro (1 a 9)' },
    b: { nivel: 'Profesional completo', edad: 40, horas: 44, sexo: 'Mujer', tam: 'Micro (1 a 9)' }
  };
  var comparar = false, simMod = 'M0';
  function modeloPerfil(p) { return modeloDe(simMod, NIV.indexOf(p.nivel)); }

  function formulario(clave, titulo) {
    var cont = $('perfil-' + clave), p = perfiles[clave];
    cont.appendChild(crear('h3', '', titulo));
    function campoSelect(rot, lista, prop) {
      var l = crear('label', 'campo'); l.appendChild(crear('span', '', rot));
      var sel = document.createElement('select');
      lista.forEach(function (o) { sel.appendChild(new Option(o, o)); });
      sel.value = p[prop];
      sel.addEventListener('change', function () { p[prop] = sel.value; if (prop === 'sexo') ajustarEdad(); actualizar(); });
      l.appendChild(sel); cont.appendChild(l); return sel;
    }
    function campoRango(rot, prop, min, max, unidad) {
      var l = crear('label', 'campo'); l.appendChild(crear('span', '', rot));
      var fila = crear('span', 'rango-fila'), r = document.createElement('input'), out = document.createElement('output');
      r.type = 'range'; r.min = min; r.max = max; r.step = 1; r.value = p[prop];
      out.textContent = p[prop] + ' ' + unidad;
      r.addEventListener('input', function () { p[prop] = +r.value; out.textContent = r.value + ' ' + unidad; actualizar(); });
      fila.appendChild(r); fila.appendChild(out); l.appendChild(fila); cont.appendChild(l);
      return { rango: r, salida: out };
    }
    campoSelect('Nivel educacional', D.niveles, 'nivel');
    var edad = campoRango('Edad', 'edad', D.rangos.edad[0], D.rangos.edad[1], 'años');
    campoRango('Horas semanales', 'horas', D.rangos.horas[0], D.rangos.horas[1], 'horas');
    campoSelect('Sexo', ['Mujer', 'Hombre'], 'sexo');
    campoSelect('Tamaño de la empresa', D.tamanos, 'tam');
    function ajustarEdad() {
      var max = p.sexo === 'Mujer' ? D.rangos.edad_mujer_max : D.rangos.edad[1];
      edad.rango.max = max;
      if (p.edad > max) { p.edad = max; edad.rango.value = max; edad.salida.textContent = max + ' años'; }
    }
    ajustarEdad();
  }
  formulario('a', 'Perfil A');
  formulario('b', 'Perfil B');
  $('chk-comparar').addEventListener('change', function (ev) { comparar = ev.target.checked; $('perfil-b').hidden = !comparar; actualizar(); });
  $('monto').addEventListener('input', actualizar);
  radio('sim-mod', function (v) { simMod = v; actualizar(); });

  function tarjeta(clave, Mx, mu) {
    var d = crear('div', 'res ' + clave);
    d.appendChild(crear('div', 'res-rot', (comparar ? 'Perfil ' + clave.toUpperCase() + ': m' : 'M') + 'oda condicional del sueldo'));
    d.appendChild(crear('div', 'res-moda', pesosMil(mu * MILLON)));
    var dl = crear('dl');
    [['Mediana condicional', pesosMil((mu + Mx.cuantil(0.5)) * MILLON)],
      ['Percentiles 25 a 75', pesosMil((mu + Mx.cuantil(0.25)) * MILLON) + ' a ' + pesosMil((mu + Mx.cuantil(0.75)) * MILLON)],
      ['Percentiles 10 a 90', pesosMil((mu + Mx.cuantil(0.10)) * MILLON) + ' a ' + pesosMil((mu + Mx.cuantil(0.90)) * MILLON)],
      ['Proporción bajo la moda', pct(50 * (1 + Mx.alpha))]
    ].forEach(function (f) { dl.appendChild(crear('dt', '', f[0])); dl.appendChild(crear('dd', '', f[1])); });
    d.appendChild(dl);
    return d;
  }
  var LECTURA_SIM = {
    M0: ['En M0 la escala y la asimetría son comunes: cambiar el perfil desplaza la curva completa sin cambiar su forma.',
      'El diagnóstico muestra que esa forma común no describe bien todos los niveles educacionales; M1 y M3 la hacen depender del nivel.'],
    M1: ['En M1 cada nivel educacional tiene su propia escala: la curva se ensancha al subir el nivel, con la misma asimetría en todos.',
      'El nivel educacional desplaza la moda, como en M0, y además cambia la dispersión.'],
    M3: ['En M3 cada nivel educacional tiene su propia escala y su propia asimetría: cambian la dispersión y la proporción de sueldos bajo la moda.',
      'La moda de los seis primeros niveles queda cerca de $500.000, el sueldo más repetido de la muestra; la diferencia entre niveles se observa en la mediana y en la cola derecha.']
  };
  var COMUN_SIM = ['La cola derecha del modelo es más pesada que la de los datos; por eso no se muestran percentiles más allá del 10 y el 90.',
    'Las cifras describen la muestra de la Casen 2024 sin factores de expansión; no son una predicción del sueldo de una persona.'];
  function actualizar() {
    if (activa !== 'condicional') return;
    var MA = modeloPerfil(perfiles.a), MB = comparar ? modeloPerfil(perfiles.b) : null;
    var muA = MA.moda(perfiles.a), muB = comparar ? MB.moda(perfiles.b) : null, monto = +$('monto').value;
    var res = $('resultados'); res.textContent = ''; res.className = 'resultados' + (comparar ? '' : ' uno');
    res.appendChild(tarjeta('a', MA, muA));
    if (comparar) res.appendChild(tarjeta('b', MB, muB));
    var altos = ['Profesional completo', 'Postgrado completo'], hayAlto = altos.indexOf(perfiles.a.nivel) >= 0 || (comparar && altos.indexOf(perfiles.b.nivel) >= 0);
    var aviso = '';
    if (simMod === 'M0' && hayAlto) aviso = 'Con escala y asimetría comunes (M0), el modelo ajusta peor en profesional completo y postgrado completo: sus residuos tienen la mayor dispersión.';
    if (simMod === 'M3') aviso = 'En M3 la moda condicional no es un sueldo representativo de los niveles altos: en profesional completo solo el ' + valores.x_pb_pro + ' de la distribución queda bajo ella. Use la mediana condicional para describir un sueldo representativo.';
    $('aviso-nivel').hidden = !aviso; $('aviso-texto').textContent = aviso;
    var ul = $('lectura-sim'); ul.textContent = '';
    LECTURA_SIM[simMod].concat(COMUN_SIM).forEach(function (t) { ul.appendChild(crear('li', '', t)); });

    var fin = Math.max(muA + MA.cuantil(0.93), comparar ? muB + MB.cuantil(0.93) : 0, Math.max(muA, muB || 0) + 1.0);
    var xmax = Math.min(8e6, techo(fin * MILLON, 500000)), paso = xmax > 4e6 ? 20000 : 10000, xs = [];
    for (var x = 0; x <= xmax; x += paso) xs.push(x);
    var curvaP = function (Mx, mu) { return xs.map(function (v) { return [v, Mx.densidad(v / MILLON, mu)]; }); };
    var capas = [{ tipo: 'linea', area: true, nombre: comparar ? 'Perfil A' : null, color: C1, puntos: curvaP(MA, muA) }];
    var marcas = [{ x: muA * MILLON, texto: (comparar ? 'Moda A: ' : 'Moda: ') + pesosMil(muA * MILLON), nivel: 0, color: C1 }];
    if (comparar) {
      capas.push({ tipo: 'linea', area: true, nombre: 'Perfil B', color: C2, puntos: curvaP(MB, muB) });
      marcas.push({ x: muB * MILLON, texto: 'Moda B: ' + pesosMil(muB * MILLON), nivel: 1, color: C2 });
    }
    marcas.push({ x: monto, texto: 'Monto: ' + corto(monto), nivel: comparar ? 2 : 1, color: TENUE });
    var cima = Math.max(MA.densidad(muA, muA), comparar ? MB.densidad(muB, muB) : 0) * 1.06;
    $('monto').max = xmax;
    G.xy($('fig-sim'), {
      alto: 340, descripcion: 'Densidad condicional del sueldo según el modelo para cada perfil',
      x: { min: 0, max: xmax, fmt: corto, titulo: 'Sueldo líquido mensual', marcas: null },
      y: { min: 0, max: cima, sinEtiquetas: true, marcas: [0] },
      capas: capas, marcasX: marcas, puntosX: xs, inicioTeclado: Math.round(muA * MILLON / paso),
      lectura: function (xv) {
        var filas = [{ color: C1, valor: pct(100 * MA.acumulada(xv / MILLON, muA)), nombre: (comparar ? 'del perfil A ' : '') + 'bajo ese sueldo' }];
        if (comparar) filas.push({ color: C2, valor: pct(100 * MB.acumulada(xv / MILLON, muB)), nombre: 'del perfil B bajo ese sueldo' });
        return { titulo: pesos(xv), filas: filas };
      },
      tabla: (function () {
        var filas = [['Moda', null], ['Percentil 10', 0.10], ['Percentil 25', 0.25], ['Mediana', 0.50], ['Percentil 75', 0.75], ['Percentil 90', 0.90]].map(function (f) {
          var va = muA + (f[1] == null ? 0 : MA.cuantil(f[1])), fila = [f[0], pesosMil(va * MILLON)];
          if (comparar) { var vb = muB + (f[1] == null ? 0 : MB.cuantil(f[1])); fila.push(pesosMil(vb * MILLON), pesosMil((vb - va) * MILLON)); }
          return fila;
        });
        var ult = ['Supera ' + pesos(monto), pct(100 * MA.supera(monto / MILLON, muA))];
        if (comparar) ult.push(pct(100 * MB.supera(monto / MILLON, muB)), '');
        filas.push(ult);
        return { cols: ['Medida', comparar ? 'Perfil A' : 'Perfil'].concat(comparar ? ['Perfil B', 'Diferencia (B − A)'] : []), filas: filas };
      })()
    });
    $('monto-out').textContent = corto(monto);
    var mr = $('monto-res'); mr.textContent = '';
    var linea = function (et, Mx, mu) {
      var pline = crear('div'); pline.appendChild(crear('strong', '', pct(100 * Mx.supera(monto / MILLON, mu))));
      pline.appendChild(document.createTextNode(' ' + et + ' supera ' + pesos(monto)));
      mr.appendChild(pline);
    };
    linea(comparar ? 'del perfil A' : 'de los sueldos de este perfil', MA, muA);
    if (comparar) linea('del perfil B', MB, muB);
  }
  registrar('condicional', actualizar);

  /* ============================ INFERENCIA ============================ */
  var tipoIC = 'cong', infMod = 'M0';
  var ETQ = { hombre: 'Hombre', edad: 'Edad', horas: 'Horas semanales', intercepto: 'Intercepto' };
  function etq(p) { return ETQ[p] || p; }
  function ic(r) { return tipoIC === 'cong' ? [r.ic_inf, r.ic_sup] : [r.est - 1.96 * r.ee_obs, r.est + 1.96 * r.ee_obs]; }
  var gruposEf = [['Nivel educacional, respecto de básica o menos', [1, 2, 3, 4, 5, 6]], ['Tamaño de empresa, respecto de microempresa', [10, 11, 12]], ['Sexo, respecto de mujer', [9]]];
  var NOTA_EF = {
    M0: 'Modelo seleccionado por BIC entre los 20: escala y asimetría comunes a todos los niveles.',
    M1: 'Con una escala por nivel, los coeficientes del nivel educacional son similares a los de M0.',
    M3: 'Con escala y asimetría por nivel, la moda casi no cambia entre los seis primeros niveles; el nivel educacional se asocia con la escala sobre la moda y con la proporción bajo ella (pestaña «Extensión por nivel educacional»).'
  };
  function dibujarEfectos() {
    var inf = F4.coef[infMod], filas = [];
    gruposEf.forEach(function (g) { g[1].forEach(function (i) { var r = inf[i], c = ic(r); filas.push({ grupo: g[0], etiqueta: etq(r.parametro), valor: r.est * MILLON, inf: c[0] * MILLON, sup: c[1] * MILLON, ee: (tipoIC === 'cong' ? r.ee_cong : r.ee_obs) * MILLON }); }); });
    G.filas($('fig-efectos'), {
      tipo: 'rango', color: C1, anchoEtiqueta: 180, margenDer: 96, descripcion: 'Coeficientes de la moda condicional con intervalos de confianza',
      filas: filas, x: { min: 0, max: 1000000, fmt: corto, titulo: 'Diferencia en la moda condicional del sueldo líquido mensual' },
      etiquetaValor: function (f) { return pesosMil(f.valor); },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: pesosMil(f.valor), nombre: 'en la moda condicional' }], nota: 'Intervalo de 95 %: ' + pesosMil(f.inf) + ' a ' + pesosMil(f.sup) + '. Error estándar: ' + pesosMil(f.ee) }; },
      tabla: { cols: ['Variable', 'Coeficiente', 'Límite inferior', 'Límite superior', 'Error estándar'], filas: filas.map(function (f) { return [f.etiqueta, pesosMil(f.valor), pesosMil(f.inf), pesosMil(f.sup), pesosMil(f.ee)]; }) }
    });
    $('nota-efectos').textContent = NOMBRE_MOD[infMod] + '. ' + NOTA_EF[infMod];
    var cont = $('efectos-continuas'); cont.textContent = '';
    [[7, 'Un año más de edad'], [8, 'Una hora semanal más de trabajo']].forEach(function (par) {
      var r = inf[par[0]], c = ic(r), d = crear('div', 'cifra');
      d.appendChild(crear('div', 'cifra-rot', par[1]));
      d.appendChild(crear('div', 'cifra-val', '+' + pesos(r.est * MILLON)));
      d.appendChild(crear('div', 'cifra-nota', 'en la moda condicional; intervalo de 95 %: ' + pesos(c[0] * MILLON) + ' a ' + pesos(c[1] * MILLON)));
      cont.appendChild(d);
    });
  }
  radio('ic', function (v) { tipoIC = v; dibujarEfectos(); });
  radio('inf-mod', function (v) { infMod = v; dibujarEfectos(); });
  registrar('inferencia', dibujarEfectos);
  registrar('inferencia', function () {
    var filas = [], inf = D.inferencia;
    gruposEf.forEach(function (g) { g[1].forEach(function (i) { filas.push({ grupo: g[0].split(',')[0], etiqueta: inf[i].parametro, valores: [inf[i].est * MILLON, D.mco[i].est * MILLON] }); }); });
    G.filas($('fig-mco'), {
      tipo: 'barra', anchoEtiqueta: 180, margenDer: 24, descripcion: 'Coeficientes de la moda (modelo de dos piezas) y de la media (mínimos cuadrados)',
      series: [{ nombre: 'Moda (t de dos piezas, M0)', color: C1 }, { nombre: 'Media (mínimos cuadrados ordinarios)', color: C2 }],
      filas: filas, x: { min: 0, max: 2000000, fmt: corto, titulo: 'Diferencia respecto de la categoría de referencia' },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: pesosMil(f.valores[0]), nombre: 'en la moda' }, { color: C2, valor: pesosMil(f.valores[1]), nombre: 'en la media' }] }; },
      tabla: { cols: ['Variable', 'Moda (t de dos piezas)', 'Media (mínimos cuadrados)'], filas: filas.map(function (f) { return [f.etiqueta, pesosMil(f.valores[0]), pesosMil(f.valores[1])]; }) }
    });
  });

  /* ============================ DIAGNÓSTICO ============================ */
  registrar('diagnostico', function () {
    var xs = [], pts = [];
    for (var r = -500000; r <= 2000000; r += 10000) { xs.push(r); pts.push([r, M.peso(r / MILLON)]); }
    G.xy($('fig-peso-curva'), {
      alto: 320, descripcion: 'Peso de una observación según su distancia a la moda',
      x: { min: -500000, max: 2000000, fmt: corto, titulo: 'Distancia entre el sueldo y la moda condicional', marcas: [-500000, 0, 500000, 1000000, 1500000, 2000000] },
      y: { min: 0, max: 2, fmt: function (v) { return num(v, 1); }, marcas: [0, 0.5, 1, 1.5, 2] },
      capas: [{ tipo: 'linea', area: true, color: C1, puntos: pts }],
      refY: [{ y: 0.5, texto: 'Peso ½' }],
      marcasX: [{ x: um.izq * MILLON, texto: valores.umbral_izq + ' bajo la moda', nivel: 0, color: TENUE }, { x: um.der * MILLON, texto: valores.umbral_der + ' sobre la moda', nivel: 1, color: TENUE }],
      puntosX: xs, inicioTeclado: 50,
      lectura: function (xv, i) { return { titulo: xv === 0 ? 'En la moda' : pesos(Math.abs(xv)) + (xv < 0 ? ' bajo la moda' : ' sobre la moda'), filas: [{ color: C1, valor: num(pts[i][1], 2), nombre: 'peso' }] }; },
      tabla: { cols: ['Distancia a la moda', 'Peso'], filas: pts.filter(function (p) { return p[0] % 100000 === 0; }).map(function (p) { return [pesos(p[0]), num(p[1], 3)]; }) }
    });
  });
  registrar('diagnostico', function () {
    G.filas($('fig-peso-nivel'), {
      tipo: 'barra', color: C1, anchoEtiqueta: 150, descripcion: 'Porcentaje de observaciones con peso menor que un medio por nivel educacional',
      filas: D.pesos_nivel.map(function (p) { return { etiqueta: p.nivel, valor: p.pct_bajo, destacada: p.nivel === 'Total', d: p }; }),
      x: { min: 0, max: 100, fmt: function (v) { return f0.format(v) + ' %'; } },
      etiquetaValor: function (f) { return pct(f.valor); },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: pct(f.valor), nombre: 'con peso menor que ½' }], nota: 'Peso medio ' + num(f.d.medio, 2) + '; peso mediano ' + num(f.d.mediano, 2) + '; ' + f0.format(f.d.n) + ' personas' }; },
      tabla: { cols: ['Nivel educacional', 'Personas', 'Peso medio', 'Peso mediano', 'Peso menor que ½'], filas: D.pesos_nivel.map(function (p) { return [p.nivel, f0.format(p.n), num(p.medio, 3), num(p.mediano, 3), pct(p.pct_bajo)]; }) }
    });
  });
  registrar('diagnostico', function () {
    G.filas($('fig-res-nivel'), {
      tipo: 'rango', color: C1, anchoEtiqueta: 150, margenDer: 20, descripcion: 'Media y desviación estándar de los residuos cuantílicos por nivel educacional',
      filas: D.residuos_nivel.map(function (r) { return { etiqueta: r.nivel, valor: r.media, inf: r.media - r.de, sup: r.media + r.de, destacada: r.nivel === 'Total', d: r }; }),
      x: { min: -2, max: 3, fmt: function (v) { return num(v, 0); }, marcas: [-2, -1, 0, 1, 2, 3], titulo: 'Residuo cuantílico' },
      refX: [{ x: -1 }, { x: 1 }],
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: num(f.d.media, 2), nombre: 'media' }, { valor: num(f.d.de, 2), nombre: 'desviación estándar' }], nota: pct(f.d.pct_bajo0) + ' de los residuos es menor o igual que 0; ' + pct(f.d.pct_mayor2) + ' supera 2 en valor absoluto' }; },
      tabla: { cols: ['Nivel educacional', 'Personas', 'Media', 'Desviación estándar', 'Residuos ≤ 0', '|Residuo| > 2'], filas: D.residuos_nivel.map(function (r) { return [r.nivel, f0.format(r.n), num(r.media, 3), num(r.de, 3), pct(r.pct_bajo0), pct(r.pct_mayor2)]; }) }
    });
  });

  /* residuos de un nivel: histograma anclado en cero y densidad del nivel */
  var NB = [10, 12, 15, 20, 24, 30, 40, 48, 60, 80, 120];
  function panelNivel(fig, K, k, nBarras, o) {
    var hn = F4.hist_nivel[K][k], p = F4.modelos[K], sg = Math.sqrt(p.sigma2[k]), al = p.alpha[k], nu = p.nu;
    var fn = function (r) { return MOD.densidadError('T', r, sg, al, nu); };
    var lim = [hn.lo, hn.hi], barras = agrupar(hn.c, 240 / nBarras, hn.n, hn.w0, hn.i0), cur = curva(fn, lim, 200);
    var res = F4.residuos[K][k];
    panelResiduos(fig, barras, cur, lim, maxVentana(barras, cur, lim) * 1.05, { fn: fn, color: o.color || C1, alto: o.alto || 170,
      esquina: 'D = ' + num(res.dmax, 3), tituloX: o.tituloX, descripcion: 'Residuos de ' + NIV[k] + ' y densidad ajustada, modelo ' + K });
  }
  var figsDiag = null, dgB = 5;
  function panelDiagNivel() {
    var cont = $('panel-diag-nivel');
    if (!figsDiag) figsDiag = NIV.map(function (l) { return figuraMini(cont, l); });
    figsDiag.forEach(function (fig, k) { panelNivel(fig, 'M0', k, NB[dgB], { tituloX: 'Residuo (millones de pesos)', alto: 190 }); });
    $('dg-barras-out').textContent = NB[dgB] + ' barras';
  }
  $('dg-barras').addEventListener('input', function (ev) { dgB = +ev.target.value; panelDiagNivel(); });
  registrar('diagnostico', panelDiagNivel);
  registrar('diagnostico', function () {
    var c0 = F4.centro.M0, filas = c0.map(function (c) { return { etiqueta: c.nivel, valores: [100 * c.masa_obs, 100 * c.masa_mod], c: c }; });
    G.filas($('fig-masa'), {
      tipo: 'barra', anchoEtiqueta: 160, margenDer: 24, descripcion: 'Proporción de residuos cercanos a la moda: observada y según el modelo',
      series: [{ nombre: 'Observada', color: GRIS }, { nombre: 'Modelo M0', color: C1 }],
      filas: filas, x: { min: 0, max: 40, fmt: function (v) { return f0.format(v) + ' %'; }, titulo: 'Residuos a menos de $50.000 de la moda' },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: GRIS, valor: pct(f.valores[0]), nombre: 'observado' }, { color: C1, valor: pct(f.valores[1]), nombre: 'según M0' }], nota: 'Razón entre la barra más alta del histograma y la densidad en la moda: ' + num(f.c.razon, 2) }; },
      tabla: { cols: ['Nivel educacional', 'Observado', 'Modelo M0', 'Razón barra más alta / densidad en la moda'], filas: filas.map(function (f) { return [f.etiqueta, pct(f.valores[0]), pct(f.valores[1]), num(f.c.razon, 2)]; }) }
    });
  });

  /* ============================ EXTENSIÓN ============================ */
  var xMod = 'M3', xB = 5, xtK = K_FD, xtVent = 'centro';
  (function tablaExt() {
    var desc = { M0: ['Común', 'Común'], M1: ['Por nivel', 'Común'], M2: ['Común', 'Por nivel'], M3: ['Por nivel', 'Por nivel'] };
    var minBic = Math.min.apply(null, F4.comparacion.map(function (c) { return c.bic; }));
    tablaEn($('tabla-ext'), ['Modelo', 'Escala σ', 'Asimetría α', 'm', 'ℓ', 'AIC', 'BIC', 'ν', 'Dif. BIC'], F4.comparacion.map(function (c) {
      return [c.modelo + (c.modelo === 'M0' ? ' (seleccionado entre los 20)' : ''), { t: desc[c.modelo][0], izq: true }, { t: desc[c.modelo][1], izq: true }, String(c.m), num(c.loglik, 2), num(c.aic, 2), { t: num(c.bic, 2), fuerte: c.bic === minBic }, num(c.nu, 3), num(c.dbic, 2)];
    }), function (k) { return F4.comparacion[k].bic === minBic ? 'elegido' : ''; }, 'compacta');
  })();
  function figEscalas() {
    var nv = F4.nivel[xMod], m0 = F4.nivel.M0[0];
    var filas = nv.map(function (r) { return { etiqueta: r.nivel, valores: [r.esc_izq * MILLON, r.esc_der * MILLON], r: r }; });
    G.filas($('fig-escalas'), {
      tipo: 'barra', anchoEtiqueta: 160, margenDer: 24, descripcion: 'Escala del error bajo y sobre la moda por nivel educacional',
      series: [{ nombre: 'Bajo la moda', color: C2 }, { nombre: 'Sobre la moda', color: C1 }],
      filas: filas, x: { min: 0, max: 1400000, fmt: corto, titulo: 'Escala del error' },
      refX: [{ x: m0.esc_izq * MILLON }, { x: m0.esc_der * MILLON }],
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C2, valor: pesosMil(f.valores[0]), nombre: 'escala bajo la moda' }, { color: C1, valor: pesosMil(f.valores[1]), nombre: 'escala sobre la moda' }], nota: 'σ = ' + num(f.r.sigma, 3) + ' millones; α = ' + num(f.r.alpha, 3) + '. En M0: ' + pesosMil(m0.esc_izq * MILLON) + ' y ' + pesosMil(m0.esc_der * MILLON) }; },
      tabla: { cols: ['Nivel educacional', 'σ (millones)', 'α', 'Escala bajo la moda', 'Escala sobre la moda'], filas: filas.map(function (f) { return [f.etiqueta, num(f.r.sigma, 4), num(f.r.alpha, 3), pesosMil(f.valores[0]), pesosMil(f.valores[1])]; }) }
    });
    tablaEn($('tabla-nivel'), ['Nivel educacional', 'Bajo la moda', 'Moda media', 'Mediana del error', 'Mediana observada'], nv.map(function (r, k) {
      return [r.nivel, pct(100 * r.p_bajo), pesosMil(r.moda_media * MILLON), pesosMil(r.mediana_error * MILLON), pesosMil(F4.mediana_obs[k] * MILLON)];
    }), null, 'compacta');
  }
  var figsExt = null;
  function panelExtNivel() {
    var cont = $('panel-ext-nivel');
    if (!figsExt) figsExt = NIV.map(function (l) { return [figuraMini(cont, ''), figuraMini(cont, '')]; });
    figsExt.forEach(function (par, k) {
      par[0].querySelector('h4').textContent = NIV[k] + ' · M0';
      par[1].querySelector('h4').textContent = NIV[k] + ' · ' + xMod;
      panelNivel(par[0], 'M0', k, NB[xB], { color: TENUE, tituloX: k === 6 ? 'Residuo (millones de pesos)' : null });
      panelNivel(par[1], xMod, k, NB[xB], { color: C1, tituloX: k === 6 ? 'Residuo (millones de pesos)' : null });
    });
    $('x-barras-out').textContent = NB[xB] + ' barras';
  }
  var figsTot = null, pesosNivel = F4.n_nivel.map(function (v) { return v / D.meta.n; });
  function densidadMezcla(K) {
    var p = F4.modelos[K];
    if (!p.sigma_nivel && !p.alpha_nivel) { var s0 = Math.sqrt(p.sigma2[0]); return function (r) { return MOD.densidadError('T', r, s0, p.alpha[0], p.nu); }; }
    var sg = p.sigma2.map(Math.sqrt);
    return function (r) { var s = 0; for (var k = 0; k < 7; k++) s += pesosNivel[k] * MOD.densidadError('T', r, sg[k], p.alpha[k], p.nu); return s; };
  }
  function panelExtTotal() {
    var cont = $('panel-ext-total'), lim = VENT[xtVent], k = KS[xtK], claves = ['M0', 'M1', 'M3'];
    if (!figsTot) figsTot = claves.map(function () { return figuraMini(cont, ''); });
    var prep = claves.map(function (K) {
      var fn = densidadMezcla(K), barras = agrupar(F4.hist_total[K].c, k, D.meta.n, HF.base, HF.i0), cur = curva(fn, lim, 300);
      return { K: K, fn: fn, barras: barras, cur: cur, max: maxVentana(barras, cur, lim) };
    });
    var ymax = Math.max.apply(null, prep.map(function (p) { return p.max; })) * 1.04;
    prep.forEach(function (p, i) {
      figsTot[i].querySelector('h4').textContent = NOMBRE_MOD[p.K];
      panelResiduos(figsTot[i], p.barras, p.cur, lim, ymax, { fn: p.fn, color: p.K === 'M0' ? TENUE : C1, alto: 230, esquina: 'BIC ' + num(filaComp(p.K).bic, 0),
        tituloX: 'Residuo (millones de pesos)', descripcion: 'Todos los residuos y densidad ajustada, modelo ' + p.K });
    });
    $('xt-ancho-out').textContent = anchoTexto(k);
  }
  var figsQQ = null;
  function panelQQ() {
    var cont = $('panel-qq'), teo = F4.qq_teorico;
    if (!figsQQ) figsQQ = NIV.map(function (l) { return figuraMini(cont, l); });
    figsQQ.forEach(function (fig, k) {
      var a = F4.qq.M0[k].map(function (v, i) { return [teo[i], v]; }), b = F4.qq[xMod][k].map(function (v, i) { return [teo[i], v]; });
      G.xy(fig, {
        alto: 170, descripcion: 'Cuantiles de los residuos cuantílicos de ' + NIV[k], margen: { l: 30, r: 8, b: 24 },
        x: { min: -2.6, max: 2.6, fmt: function (v) { return num(v, 0); }, marcas: [-2, 0, 2] },
        y: { min: -2.8, max: 2.8, fmt: function (v) { return num(v, 0); }, marcas: [-2, 0, 2] },
        capas: [{ tipo: 'linea', color: '#B3BBC4', puntos: [[-2.6, -2.6], [2.6, 2.6]], grosor: 1, trazo: '3 3' },
          { tipo: 'linea', color: TENUE, nombre: 'M0', puntos: a }, { tipo: 'linea', color: C1, nombre: xMod, puntos: b }],
        puntosX: teo,
        lectura: function (xv, i) { return { titulo: 'Cuantil normal ' + num(xv, 2), filas: [{ color: TENUE, valor: num(a[i][1], 2), nombre: 'M0' }, { color: C1, valor: num(b[i][1], 2), nombre: xMod }] }; }
      });
    });
    var r0 = F4.residuos.M0, rx = F4.residuos[xMod];
    tablaEn($('tabla-resq'), ['Nivel educacional', 'Media M0', 'DE M0', 'D M0', 'Media ' + xMod, 'DE ' + xMod, 'D ' + xMod], r0.map(function (r, k) {
      return [r.nivel, num(r.media, 3), num(r.de, 3), num(r.dmax, 3), num(rx[k].media, 3), num(rx[k].de, 3), num(rx[k].dmax, 3)];
    }), function (k) { return r0[k].nivel === 'Total' ? 'total' : ''; }, 'compacta');
  }
  (function tablaBeta() {
    var c0 = F4.coef.M0, c1 = F4.coef.M1, c3 = F4.coef.M3;
    tablaEn($('tabla-beta'), ['Coeficiente', 'M0', 'M1', 'M3'], c0.map(function (r, i) {
      var f = function (v) { return (i === 7 || i === 8) ? pesos(v * MILLON) : pesosMil(v * MILLON); };
      return [etq(r.parametro), f(r.est), f(c1[i].est), f(c3[i].est)];
    }), null, 'compacta');
  })();
  function dibujarExtension() { figEscalas(); panelExtNivel(); panelExtTotal(); panelQQ(); }
  radio('x-mod', function (v) { xMod = v; dibujarExtension(); });
  radio('xvent', function (v) { xtVent = v; panelExtTotal(); });
  $('x-barras').addEventListener('input', function (ev) { xB = +ev.target.value; panelExtNivel(); });
  $('xt-ancho').addEventListener('input', function (ev) { xtK = +ev.target.value; panelExtTotal(); });
  registrar('extension', dibujarExtension);

  vistas.metodologia = vistas.metodologia || [];
  mostrar(location.hash.slice(1) || 'presentacion', true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { dibujar(activa); });
})();
