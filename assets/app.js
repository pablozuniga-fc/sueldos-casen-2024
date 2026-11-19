/* Tablero de la tesis: conecta los datos agregados (datos/datos.js), el modelo TP-t (modelo.js) y los gráficos (graficos.js). */
(function () {
  'use strict';
  var D = window.DATOS, M = window.Modelo.crear(D.modelo), G = window.Graf;
  var C1 = '#E77500', C2 = '#498BCA', GRIS = '#394049';
  var MILLON = 1e6;

  /* ---------- formatos (es-CL: punto de miles y coma decimal) ---------- */
  function nf(d) { return new Intl.NumberFormat('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  var f0 = nf(0), f1 = nf(1), f2 = nf(2), f3 = nf(3);
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

  /* ---------- pestañas ---------- */
  var vistas = {}, activa = 'panorama';
  function registrar(id, fn) { (vistas[id] = vistas[id] || []).push(fn); }
  function dibujar(id) { (vistas[id] || []).forEach(function (fn) { fn(); }); }
  function mostrar(id, sinHistorial) {
    if (!$('sec-' + id)) id = 'panorama';
    activa = id;
    document.querySelectorAll('.seccion').forEach(function (sec) { sec.hidden = sec.id !== 'sec-' + id; });
    document.querySelectorAll('.pestana').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.ir === id ? 'true' : 'false'); });
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

  /* ---------- cifras en el texto ---------- */
  var total = D.hist.grupos.total, um = M.umbralPeso();
  var bic = {}; D.ajuste.forEach(function (a) { bic[a.modelo] = a.bic; });
  var valores = {
    n: f0.format(D.meta.n), frecuente: pesos(D.frecuentes[0].monto), frecuente_pct: pct(D.frecuentes[0].pct),
    mediana: pesos(D.sueldo.mediana * MILLON), media: pesos(D.sueldo.media * MILLON),
    mayor_total: pct(100 * total.mayor / total.n), prop_obs: pct(100 * D.forma.prop_obs), prop_esp: pct(100 * D.forma.prop_esp),
    bic_tpt: f0.format(bic['TP-t']), bic_normal: f0.format(bic['Normal']),
    media_modelo: pesosMil(D.forma.media_modelo * MILLON), media_obs: pesosMil(D.forma.media_obs * MILLON),
    m10: pct(D.redondeo.m10), m50: pct(D.redondeo.m50), m100: pct(D.redondeo.m100), distintos: f0.format(D.redondeo.distintos),
    alpha: num(D.modelo.alpha, 3), nu: num(D.modelo.nu, 3), esc_izq: pesosMil(M.escIzq * MILLON), esc_der: pesosMil(M.escDer * MILLON),
    peso_max: num(M.peso(0), 2), umbral_izq: pesos(Math.round(-um.izq * 10000) * 100), umbral_der: pesos(Math.round(um.der * 10000) * 100),
    pct_bajo_total: pct(D.pesos_nivel[D.pesos_nivel.length - 1].pct_bajo)
  };
  document.querySelectorAll('[data-v]').forEach(function (e) { e.textContent = valores[e.dataset.v] || ''; });

  /* ---------- histogramas ---------- */
  var centros = D.hist.centros, ancho = D.hist.ancho;
  function porcentajes(g) { return g.c.map(function (c, i) { return [centros[i], 100 * c / g.n]; }); }
  function tramo(x) { return x === 0 ? 'Menos de $25.000' : 'De ' + pesos(x - ancho / 2) + ' a ' + pesos(x + ancho / 2 - 1); }
  var ejeSueldo = { min: -ancho / 2, max: centros[centros.length - 1] + ancho / 2, fmt: corto, titulo: 'Sueldo líquido mensual', marcas: [0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000] };
  function techo(v, paso) { return Math.ceil(v / paso - 1e-9) * paso; }

  /* ============================ PANORAMA ============================ */
  registrar('panorama', function () {
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

  /* ============================ LOS SUELDOS ============================ */
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
    // resumen
    var cont = $('resumen-grupos'); cont.textContent = '';
    cont.appendChild(crear('h3', '', 'Resumen del sueldo'));
    var t = crear('table', 'tabla'), th = crear('thead'), tr = crear('tr');
    ['Grupo', 'Personas', 'Media', 'Mediana', 'Desviación estándar'].forEach(function (c, i) { var e = crear('th', i ? 'num' : '', c); e.setAttribute('scope', 'col'); tr.appendChild(e); });
    th.appendChild(tr); t.appendChild(th);
    var tb = crear('tbody');
    [a].concat(b ? [b] : []).forEach(function (k) {
      var r = resumenGrupo(k), fila = crear('tr');
      fila.appendChild(crear('th', '', nombreGrupo(k)));
      [f0.format(r.n), pesosMil(r.media * MILLON), pesosMil(r.mediana * MILLON), pesosMil(r.de * MILLON)].forEach(function (v) { fila.appendChild(crear('td', 'num', v)); });
      tb.appendChild(fila);
    });
    t.appendChild(tb); cont.appendChild(t);
  }
  $('sel-grupo').addEventListener('change', dibujarHist);
  $('sel-comparar').addEventListener('change', dibujarHist);
  registrar('sueldos', dibujarHist);

  registrar('sueldos', function () {
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
  ['esc', 'edad'].forEach(function (v) { D.perfiles[v].forEach(function (p) { maxPerfil = Math.max(maxPerfil, p.media, p.mediana); }); });
  function dibujarPerfil(fig, clave, titulo, sufijo) {
    var datos = D.perfiles[clave], xs = datos.map(function (p) { return p.x; });
    G.xy($(fig), {
      alto: 300, margenDer: 22, descripcion: titulo,
      x: { min: xs[0], max: xs[xs.length - 1], fmt: function (v) { return f0.format(v); }, titulo: titulo },
      y: { min: 0, max: techo(maxPerfil * MILLON, 500000), fmt: corto },
      capas: [
        { tipo: 'linea', nombre: 'Media', color: C1, puntos: datos.map(function (p) { return [p.x, p.media * MILLON]; }) },
        { tipo: 'linea', nombre: 'Mediana', color: C2, puntos: datos.map(function (p) { return [p.x, p.mediana * MILLON]; }) }
      ],
      puntosX: xs,
      lectura: function (x, i) {
        return { titulo: f0.format(x) + ' ' + sufijo, filas: [{ color: C1, valor: pesosMil(datos[i].media * MILLON), nombre: 'media' }, { color: C2, valor: pesosMil(datos[i].mediana * MILLON), nombre: 'mediana' }], nota: f0.format(datos[i].n) + ' personas' };
      },
      tabla: { cols: [titulo, 'Personas', 'Media', 'Mediana'], filas: datos.map(function (p) { return [f0.format(p.x), f0.format(p.n), pesosMil(p.media * MILLON), pesosMil(p.mediana * MILLON)]; }) }
    });
  }
  registrar('sueldos', function () { dibujarPerfil('fig-perfil-esc', 'esc', 'Años de escolaridad', 'años de escolaridad'); });
  registrar('sueldos', function () { dibujarPerfil('fig-perfil-edad', 'edad', 'Edad (años)', 'años'); });

  /* ============================ SIMULADOR ============================ */
  var perfiles = {
    a: { nivel: 'Media completa', edad: 40, horas: 44, sexo: 'Mujer', tam: 'Micro (1 a 9)' },
    b: { nivel: 'Profesional completo', edad: 40, horas: 44, sexo: 'Mujer', tam: 'Micro (1 a 9)' }
  };
  var comparar = false;
  var Q = { p10: M.cuantil(0.10), p25: M.cuantil(0.25), p50: M.cuantil(0.50), p75: M.cuantil(0.75), p90: M.cuantil(0.90) };

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
      // la muestra incluye mujeres hasta los 59 años y hombres hasta los 64
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

  function tarjeta(clave, mu) {
    var d = crear('div', 'res ' + clave);
    d.appendChild(crear('div', 'res-rot', (comparar ? 'Perfil ' + clave.toUpperCase() + ': s' : 'S') + 'ueldo más frecuente según el modelo'));
    d.appendChild(crear('div', 'res-moda', pesosMil(mu * MILLON)));
    var dl = crear('dl');
    [['Mediana', pesosMil((mu + Q.p50) * MILLON)],
      ['La mitad central está entre', pesosMil((mu + Q.p25) * MILLON) + ' y ' + pesosMil((mu + Q.p75) * MILLON)],
      ['8 de cada 10 están entre', pesosMil((mu + Q.p10) * MILLON) + ' y ' + pesosMil((mu + Q.p90) * MILLON)]
    ].forEach(function (f) { dl.appendChild(crear('dt', '', f[0])); dl.appendChild(crear('dd', '', f[1])); });
    d.appendChild(dl);
    return d;
  }
  function actualizar() {
    if (activa !== 'simulador') return;
    var muA = M.moda(perfiles.a), muB = comparar ? M.moda(perfiles.b) : null, monto = +$('monto').value;
    var res = $('resultados'); res.textContent = ''; res.className = 'resultados' + (comparar ? '' : ' uno');
    res.appendChild(tarjeta('a', muA));
    if (comparar) res.appendChild(tarjeta('b', muB));
    var altos = ['Profesional completo', 'Postgrado completo'];
    $('aviso-nivel').hidden = !(altos.indexOf(perfiles.a.nivel) >= 0 || (comparar && altos.indexOf(perfiles.b.nivel) >= 0));

    var xmax = techo((Math.max(muA, muB || 0) + 1.3) * MILLON, 500000), paso = 10000, xs = [];
    for (var x = 0; x <= xmax; x += paso) xs.push(x);
    var curva = function (mu) { return xs.map(function (v) { return [v, M.densidad(v / MILLON, mu)]; }); };
    var capas = [{ tipo: 'linea', area: true, nombre: comparar ? 'Perfil A' : null, color: C1, puntos: curva(muA) }];
    var marcas = [{ x: muA * MILLON, texto: (comparar ? 'Moda A: ' : 'Moda: ') + pesosMil(muA * MILLON), nivel: 0, color: C1 }];
    if (comparar) {
      capas.push({ tipo: 'linea', area: true, nombre: 'Perfil B', color: C2, puntos: curva(muB) });
      marcas.push({ x: muB * MILLON, texto: 'Moda B: ' + pesosMil(muB * MILLON), nivel: 1, color: C2 });
    }
    marcas.push({ x: monto, texto: 'Monto: ' + corto(monto), nivel: comparar ? 2 : 1, color: '#7C8792' });
    var cima = M.densidad(0, 0) * 1.06;
    G.xy($('fig-sim'), {
      alto: 340, descripcion: 'Densidad del sueldo según el modelo para cada perfil',
      x: { min: 0, max: xmax, fmt: corto, titulo: 'Sueldo líquido mensual', marcas: null },
      y: { min: 0, max: cima, sinEtiquetas: true, marcas: [0] },
      capas: capas, marcasX: marcas, puntosX: xs, inicioTeclado: Math.round(muA * MILLON / paso),
      lectura: function (xv) {
        var filas = [{ color: C1, valor: pct(100 * M.acumulada(xv / MILLON, muA)), nombre: (comparar ? 'del perfil A ' : '') + 'gana menos' }];
        if (comparar) filas.push({ color: C2, valor: pct(100 * M.acumulada(xv / MILLON, muB)), nombre: 'del perfil B gana menos' });
        return { titulo: pesos(xv), filas: filas };
      },
      tabla: (function () {
        var filas = [['Moda', 0], ['Percentil 10', Q.p10], ['Percentil 25', Q.p25], ['Mediana', Q.p50], ['Percentil 75', Q.p75], ['Percentil 90', Q.p90]].map(function (f) {
          var fila = [f[0], pesosMil((muA + f[1]) * MILLON)];
          if (comparar) fila.push(pesosMil((muB + f[1]) * MILLON), pesosMil((muB - muA) * MILLON));
          return fila;
        });
        var ult = ['Supera ' + pesos(monto), pct(100 * M.supera(monto / MILLON, muA))];
        if (comparar) ult.push(pct(100 * M.supera(monto / MILLON, muB)), '');
        filas.push(ult);
        return { cols: ['Medida', comparar ? 'Perfil A' : 'Perfil'].concat(comparar ? ['Perfil B', 'Diferencia (B − A)'] : []), filas: filas };
      })()
    });
    $('monto-out').textContent = corto(monto);
    var mr = $('monto-res'); mr.textContent = '';
    var linea = function (et, mu) {
      var pline = crear('div'); pline.appendChild(crear('strong', '', pct(100 * M.supera(monto / MILLON, mu))));
      pline.appendChild(document.createTextNode(' ' + et + ' supera ' + pesos(monto)));
      mr.appendChild(pline);
    };
    linea(comparar ? 'del perfil A' : 'de los sueldos de este perfil', muA);
    if (comparar) linea('del perfil B', muB);
  }
  registrar('simulador', actualizar);

  /* ============================ EFECTOS ============================ */
  var inf = D.inferencia, tipoIC = 'cong';
  function ic(r) { return tipoIC === 'cong' ? [r.ic_inf, r.ic_sup] : [r.est - 1.96 * r.ee_obs, r.est + 1.96 * r.ee_obs]; }
  var gruposEf = [['Nivel educacional, respecto de básica o menos', [1, 2, 3, 4, 5, 6]], ['Tamaño de empresa, respecto de microempresa', [10, 11, 12]], ['Sexo, respecto de mujer', [9]]];
  function dibujarEfectos() {
    var filas = [];
    gruposEf.forEach(function (g) { g[1].forEach(function (i) { var r = inf[i], c = ic(r); filas.push({ grupo: g[0], etiqueta: r.parametro, valor: r.est * MILLON, inf: c[0] * MILLON, sup: c[1] * MILLON, ee: (tipoIC === 'cong' ? r.ee_cong : r.ee_obs) * MILLON }); }); });
    G.filas($('fig-efectos'), {
      tipo: 'rango', color: C1, anchoEtiqueta: 180, margenDer: 96, descripcion: 'Efectos sobre la moda del sueldo con intervalos de confianza',
      filas: filas, x: { min: 0, max: 1000000, fmt: corto, titulo: 'Diferencia en la moda del sueldo líquido mensual' },
      etiquetaValor: function (f) { return pesosMil(f.valor); },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: pesosMil(f.valor), nombre: 'más en la moda' }], nota: 'Intervalo de 95 %: ' + pesosMil(f.inf) + ' a ' + pesosMil(f.sup) + '. Error estándar: ' + pesosMil(f.ee) }; },
      tabla: { cols: ['Característica', 'Diferencia en la moda', 'Límite inferior', 'Límite superior', 'Error estándar'], filas: filas.map(function (f) { return [f.etiqueta, pesosMil(f.valor), pesosMil(f.inf), pesosMil(f.sup), pesosMil(f.ee)]; }) }
    });
    var cont = $('efectos-continuas'); cont.textContent = '';
    [[7, 'Cada año más de edad'], [8, 'Cada hora semanal más de trabajo']].forEach(function (par) {
      var r = inf[par[0]], c = ic(r), d = crear('div', 'cifra');
      d.appendChild(crear('div', 'cifra-rot', par[1]));
      d.appendChild(crear('div', 'cifra-val', '+' + pesos(r.est * MILLON)));
      d.appendChild(crear('div', 'cifra-nota', 'en la moda del sueldo; intervalo de 95 %: ' + pesos(c[0] * MILLON) + ' a ' + pesos(c[1] * MILLON)));
      cont.appendChild(d);
    });
  }
  document.querySelectorAll('input[name="ic"]').forEach(function (r) { r.addEventListener('change', function () { tipoIC = r.value; dibujarEfectos(); }); });
  registrar('efectos', dibujarEfectos);
  registrar('efectos', function () {
    var filas = [];
    gruposEf.forEach(function (g) { g[1].forEach(function (i) { filas.push({ grupo: g[0].split(',')[0], etiqueta: inf[i].parametro, valores: [inf[i].est * MILLON, D.mco[i].est * MILLON] }); }); });
    G.filas($('fig-mco'), {
      tipo: 'barra', anchoEtiqueta: 180, margenDer: 24, descripcion: 'Comparación entre efectos sobre la moda y sobre la media',
      series: [{ nombre: 'Moda (modelo t de dos piezas)', color: C1 }, { nombre: 'Media (mínimos cuadrados)', color: C2 }],
      filas: filas, x: { min: 0, max: 2000000, fmt: corto, titulo: 'Diferencia respecto de la categoría de referencia' },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: pesosMil(f.valores[0]), nombre: 'en la moda' }, { color: C2, valor: pesosMil(f.valores[1]), nombre: 'en la media' }] }; },
      tabla: { cols: ['Característica', 'Moda (t de dos piezas)', 'Media (mínimos cuadrados)'], filas: filas.map(function (f) { return [f.etiqueta, pesosMil(f.valores[0]), pesosMil(f.valores[1])]; }) }
    });
  });

  /* ============================ PESOS Y AJUSTE ============================ */
  registrar('pesos', function () {
    var xs = [], pts = [];
    for (var r = -500000; r <= 2000000; r += 10000) { xs.push(r); pts.push([r, M.peso(r / MILLON)]); }
    G.xy($('fig-peso-curva'), {
      alto: 320, descripcion: 'Peso de una observación según su distancia a la moda',
      x: { min: -500000, max: 2000000, fmt: corto, titulo: 'Distancia entre el sueldo y la moda de su perfil', marcas: [-500000, 0, 500000, 1000000, 1500000, 2000000] },
      y: { min: 0, max: 2, fmt: function (v) { return num(v, 1); }, marcas: [0, 0.5, 1, 1.5, 2] },
      capas: [{ tipo: 'linea', area: true, color: C1, puntos: pts }],
      refY: [{ y: 0.5, texto: 'Peso ½' }],
      marcasX: [{ x: um.izq * MILLON, texto: valores.umbral_izq + ' bajo la moda', nivel: 0, color: '#7C8792' }, { x: um.der * MILLON, texto: valores.umbral_der + ' sobre la moda', nivel: 1, color: '#7C8792' }],
      puntosX: xs, inicioTeclado: 50,
      lectura: function (xv, i) { return { titulo: xv === 0 ? 'En la moda' : pesos(Math.abs(xv)) + (xv < 0 ? ' bajo la moda' : ' sobre la moda'), filas: [{ color: C1, valor: num(pts[i][1], 2), nombre: 'peso' }] }; },
      tabla: { cols: ['Distancia a la moda', 'Peso'], filas: pts.filter(function (p) { return p[0] % 100000 === 0; }).map(function (p) { return [pesos(p[0]), num(p[1], 3)]; }) }
    });
  });
  registrar('pesos', function () {
    G.filas($('fig-peso-nivel'), {
      tipo: 'barra', color: C1, anchoEtiqueta: 150, descripcion: 'Porcentaje de sueldos con peso menor que un medio por nivel educacional',
      filas: D.pesos_nivel.map(function (p) { return { etiqueta: p.nivel, valor: p.pct_bajo, destacada: p.nivel === 'Total', d: p }; }),
      x: { min: 0, max: 100, fmt: function (v) { return f0.format(v) + ' %'; } },
      etiquetaValor: function (f) { return pct(f.valor); },
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: pct(f.valor), nombre: 'con peso menor que ½' }], nota: 'Peso medio ' + num(f.d.medio, 2) + '; peso mediano ' + num(f.d.mediano, 2) + '; ' + f0.format(f.d.n) + ' personas' }; },
      tabla: { cols: ['Nivel educacional', 'Personas', 'Peso medio', 'Peso mediano', 'Peso menor que ½'], filas: D.pesos_nivel.map(function (p) { return [p.nivel, f0.format(p.n), num(p.medio, 3), num(p.mediano, 3), pct(p.pct_bajo)]; }) }
    });
  });
  registrar('pesos', function () {
    G.filas($('fig-res-nivel'), {
      tipo: 'rango', color: C1, anchoEtiqueta: 150, margenDer: 20, descripcion: 'Media y desviación estándar de los residuos cuantílicos por nivel educacional',
      filas: D.residuos_nivel.map(function (r) { return { etiqueta: r.nivel, valor: r.media, inf: r.media - r.de, sup: r.media + r.de, destacada: r.nivel === 'Total', d: r }; }),
      x: { min: -2, max: 3, fmt: function (v) { return num(v, 0); }, marcas: [-2, -1, 0, 1, 2, 3], titulo: 'Residuo cuantílico' },
      refX: [{ x: -1 }, { x: 1 }],
      lectura: function (f) { return { titulo: f.etiqueta, filas: [{ color: C1, valor: num(f.d.media, 2), nombre: 'media' }, { valor: num(f.d.de, 2), nombre: 'desviación estándar' }], nota: pct(f.d.pct_bajo0) + ' de los residuos es menor o igual que 0; ' + pct(f.d.pct_mayor2) + ' supera 2 en valor absoluto' }; },
      tabla: { cols: ['Nivel educacional', 'Personas', 'Media', 'Desviación estándar', 'Residuos ≤ 0', '|Residuo| > 2'], filas: D.residuos_nivel.map(function (r) { return [r.nivel, f0.format(r.n), num(r.media, 3), num(r.de, 3), pct(r.pct_bajo0), pct(r.pct_mayor2)]; }) }
    });
  });
  (function tablaModelos() {
    var t = crear('table', 'tabla'), th = crear('thead'), tr = crear('tr');
    ['Modelo', 'BIC', 'Asimetría de los residuos', 'Curtosis de los residuos', '|Residuo| > 2', '|Residuo| > 3'].forEach(function (c, i) { var e = crear('th', i ? 'num' : '', c); e.setAttribute('scope', 'col'); tr.appendChild(e); });
    th.appendChild(tr); t.appendChild(th);
    var tb = crear('tbody');
    D.residuos_modelo.forEach(function (r) {
      var fila = crear('tr', r.modelo === 'TP-t' ? 'elegido' : ''), nombre = r.modelo.replace(' (MCO)', ''), b = bic[nombre];
      var etiqueta = r.modelo === 'TP-t' ? 'TP-t (modelo seleccionado)' : r.modelo.replace('Referencia N(0, 1)', 'Referencia: normal estándar');
      fila.appendChild(crear('th', '', etiqueta));
      [b ? f0.format(b) : '', num(r.asimetria, 3), num(r.curtosis, 3), pct(r.pct2, 2), pct(r.pct3, 2)].forEach(function (v) { fila.appendChild(crear('td', 'num', v)); });
      tb.appendChild(fila);
    });
    t.appendChild(tb); $('tabla-modelos').appendChild(t);
  })();

  vistas.ficha = vistas.ficha || [];
  mostrar(location.hash.slice(1) || 'panorama', true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { dibujar(activa); });
})();
