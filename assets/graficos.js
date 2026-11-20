/* Gráficos SVG sin dependencias: Graf.xy (ejes numéricos) y Graf.filas (una fila por categoría).
   Cada figura tiene leyenda, lectura al pasar el cursor o con el teclado y una tabla equivalente. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function texto(parent, x, y, str, clase, anchor) {
    var t = s('text', { x: x, y: y, 'class': clase || 'g-txt', 'text-anchor': anchor || 'start' }, parent);
    t.textContent = str;
    return t;
  }

  function marcasEje(min, max, n) {
    var span = max - min;
    if (!(span > 0)) return [min];
    var bruto = span / Math.max(1, n), mag = Math.pow(10, Math.floor(Math.log10(bruto))), r = bruto / mag;
    var paso = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag, out = [];
    for (var v = Math.ceil(min / paso - 1e-9) * paso; v <= max + paso * 1e-9; v += paso) out.push((Math.round(v / paso) * paso) || 0);
    return out;
  }

  /* ---------- lectura flotante ---------- */
  var tip = null;
  function mostrarTip(cx, cy, contenido) {
    if (!tip) { tip = h('div', 'tip'); tip.setAttribute('role', 'status'); document.body.appendChild(tip); }
    tip.textContent = '';
    if (contenido.titulo) tip.appendChild(h('div', 'tip-tit', contenido.titulo));
    (contenido.filas || []).forEach(function (f) {
      var fila = h('div', 'tip-fila');
      if (f.color) { var k = h('span', 'tip-clave'); k.style.background = f.color; fila.appendChild(k); }
      fila.appendChild(h('strong', '', f.valor));
      fila.appendChild(h('span', 'tip-nom', f.nombre));
      tip.appendChild(fila);
    });
    if (contenido.nota) tip.appendChild(h('div', 'tip-nota', contenido.nota));
    tip.style.display = 'block';
    var w = tip.offsetWidth, hh = tip.offsetHeight, x = cx + 14, y = cy - hh - 12;
    if (x + w > window.innerWidth - 8) x = cx - w - 14;
    if (x < 8) x = 8;
    if (y < 8) y = cy + 16;
    tip.style.left = (x + window.scrollX) + 'px';
    tip.style.top = (y + window.scrollY) + 'px';
  }
  function ocultarTip() { if (tip) tip.style.display = 'none'; }

  /* ---------- piezas comunes de una figura ---------- */
  function partes(fig) {
    return { plot: fig.querySelector('.fig-plot'), leyenda: fig.querySelector('.fig-leyenda'),
      tabla: fig.querySelector('.fig-tabla'), boton: fig.querySelector('.btn-tabla') };
  }
  function leyenda(p, series) {
    if (!p.leyenda) return;
    p.leyenda.textContent = '';
    if (!series || series.length < 2) return;
    series.forEach(function (se) {
      var it = h('span', 'ley-item');
      var sw = h('span', 'ley-' + (se.forma || 'linea'));
      sw.style.background = se.color;
      it.appendChild(sw);
      it.appendChild(h('span', '', se.nombre));
      p.leyenda.appendChild(it);
    });
  }
  function tabla(p, def) {
    if (!p.tabla || !def) return;
    p.tabla.textContent = '';
    var t = h('table', 'tabla'), thead = h('thead'), tr = h('tr');
    def.cols.forEach(function (c, i) { var th = h('th', i ? 'num' : '', c); th.setAttribute('scope', 'col'); tr.appendChild(th); });
    thead.appendChild(tr); t.appendChild(thead);
    var tb = h('tbody');
    def.filas.forEach(function (f) {
      var r = h('tr');
      f.forEach(function (c, i) { r.appendChild(h(i ? 'td' : 'th', i ? 'num' : '', c)); });
      tb.appendChild(r);
    });
    t.appendChild(tb); p.tabla.appendChild(t);
    if (p.boton && !p.boton.dataset.listo) {
      p.boton.dataset.listo = '1';
      p.boton.addEventListener('click', function () {
        var ver = p.tabla.hidden;
        p.tabla.hidden = !ver; p.plot.hidden = ver;
        p.boton.textContent = ver ? 'Ver gráfico' : 'Ver tabla';
        p.boton.setAttribute('aria-pressed', ver ? 'true' : 'false');
        if (!ver) window.dispatchEvent(new Event('resize'));
      });
    }
  }
  function barraRedondeada(x, y, w, hgt, r, lado) {
    // lado: 'arriba' (columna) o 'derecha' / 'izquierda' (barra horizontal); la base queda recta
    r = Math.max(0, Math.min(r, w / 2, hgt / 2));
    if (lado === 'arriba') return 'M' + x + ',' + (y + hgt) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + hgt) + 'Z';
    if (lado === 'derecha') return 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + hgt - r) + 'Q' + (x + w) + ',' + (y + hgt) + ' ' + (x + w - r) + ',' + (y + hgt) + 'H' + x + 'Z';
    return 'M' + (x + w) + ',' + y + 'H' + (x + r) + 'Q' + x + ',' + y + ' ' + x + ',' + (y + r) + 'V' + (y + hgt - r) + 'Q' + x + ',' + (y + hgt) + ' ' + (x + r) + ',' + (y + hgt) + 'H' + (x + w) + 'Z';
  }

  /* ---------- Graf.xy: barras verticales, escalones, líneas y áreas sobre ejes numéricos ---------- */
  function xy(fig, o) {
    var p = partes(fig), W = p.plot.clientWidth;
    if (W < 60) return;
    p.plot.textContent = '';
    var niveles = 0;
    (o.marcasX || []).forEach(function (m) { if (m.texto) niveles = Math.max(niveles, (m.nivel || 0) + 1); });
    var estrecho = W < 520;
    var mg = { l: o.y.sinEtiquetas ? 14 : 58, r: o.margenDer || 18, t: 10 + niveles * 18, b: o.x.titulo ? 46 : 28 };
    if (o.margen) for (var km in o.margen) mg[km] = o.margen[km];
    var H = (o.alto || 300), pw = W - mg.l - mg.r, ph = H - mg.t - mg.b;
    var X = function (v) { return mg.l + (v - o.x.min) / (o.x.max - o.x.min) * pw; };
    var Y = function (v) { return mg.t + ph - (v - o.y.min) / (o.y.max - o.y.min) * ph; };
    var svg = s('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', tabindex: '0', 'aria-label': o.descripcion || 'Gráfico' }, p.plot);

    // rejilla y ejes
    var ty = o.y.marcas || marcasEje(o.y.min, o.y.max, 4);
    ty.forEach(function (v) {
      s('line', { x1: mg.l, x2: mg.l + pw, y1: Y(v), y2: Y(v), 'class': v === o.y.min ? 'g-base' : 'g-rejilla' }, svg);
      if (!o.y.sinEtiquetas) texto(svg, mg.l - 8, Y(v) + 4, o.y.fmt(v), 'g-eje', 'end');
    });
    if (o.y.sinEtiquetas) s('line', { x1: mg.l, x2: mg.l + pw, y1: Y(o.y.min), y2: Y(o.y.min), 'class': 'g-base' }, svg);
    var tx = o.x.marcas || marcasEje(o.x.min, o.x.max, estrecho ? 4 : 7);
    if (estrecho && tx.length > 5) tx = tx.filter(function (_, i) { return i % 2 === 0; });
    tx.forEach(function (v) {
      if (v < o.x.min || v > o.x.max) return;
      s('line', { x1: X(v), x2: X(v), y1: mg.t + ph, y2: mg.t + ph + 4, 'class': 'g-base' }, svg);
      texto(svg, X(v), mg.t + ph + 18, o.x.fmt(v), 'g-eje', 'middle');
    });
    if (o.x.titulo) texto(svg, mg.l + pw / 2, H - 6, o.x.titulo, 'g-titulo-eje', 'middle');
    if (o.y.titulo) texto(svg, mg.l, mg.t - (niveles ? niveles * 18 : 0) + 2, '', 'g-titulo-eje');
    (o.refY || []).forEach(function (r) {
      s('line', { x1: mg.l, x2: mg.l + pw, y1: Y(r.y), y2: Y(r.y), 'class': 'g-ref' }, svg);
      if (r.texto) texto(svg, mg.l + pw - 4, Y(r.y) - 5, r.texto, 'g-nota', 'end');
    });

    // capas
    var series = [];
    o.capas.forEach(function (c) {
      if (c.nombre) series.push({ nombre: c.nombre, color: c.color, forma: (c.tipo === 'barras' || c.tipo === 'hist') ? 'caja' : 'linea' });
      if (c.tipo === 'hist') {
        var dh = '';
        c.puntos.forEach(function (pt) {
          if (!(pt[2] > 0) || pt[1] <= o.x.min || pt[0] >= o.x.max) return;
          var xa = X(Math.max(pt[0], o.x.min)), xb = X(Math.min(pt[1], o.x.max)), sep = xb - xa > 3 ? 0.5 : 0, yt = Y(Math.min(pt[2], o.y.max));
          dh += 'M' + (xa + sep).toFixed(1) + ',' + Y(o.y.min).toFixed(1) + 'V' + yt.toFixed(1) + 'H' + (xb - sep).toFixed(1) + 'V' + Y(o.y.min).toFixed(1) + 'Z';
        });
        s('path', { d: dh, fill: c.color, opacity: c.opacidad || 1 }, svg);
      } else if (c.tipo === 'barras') {
        var wpx = Math.abs(X(c.ancho) - X(0)), w = Math.max(1, Math.min(24, wpx - 2));
        c.puntos.forEach(function (pt) {
          if (!(pt[1] > 0)) return;
          var y0 = Y(pt[1]);
          s('path', { d: barraRedondeada(X(pt[0]) - w / 2, y0, w, Y(o.y.min) - y0, 4, 'arriba'), fill: c.color }, svg);
        });
      } else if (c.tipo === 'escalon') {
        var d = '';
        c.puntos.forEach(function (pt, i) {
          var x0 = X(pt[0] - c.ancho / 2), x1 = X(pt[0] + c.ancho / 2), yy = Y(pt[1]);
          d += (i ? 'L' : 'M') + x0 + ',' + yy + 'L' + x1 + ',' + yy;
        });
        s('path', { d: d, fill: 'none', stroke: c.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
      } else {
        var dl = '';
        c.puntos.forEach(function (pt, i) { dl += (i ? 'L' : 'M') + X(pt[0]).toFixed(1) + ',' + Y(Math.min(pt[1], o.y.max)).toFixed(1); });
        if (c.area) s('path', { d: dl + 'L' + X(c.puntos[c.puntos.length - 1][0]) + ',' + Y(o.y.min) + 'L' + X(c.puntos[0][0]) + ',' + Y(o.y.min) + 'Z', fill: c.color, opacity: 0.1 }, svg);
        var at = { d: dl, fill: 'none', stroke: c.color, 'stroke-width': c.grosor || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
        if (c.trazo) at['stroke-dasharray'] = c.trazo;
        s('path', at, svg);
        if (c.marcadores) c.puntos.forEach(function (pt) { s('circle', { cx: X(pt[0]), cy: Y(pt[1]), r: 3, fill: c.color, stroke: '#fff', 'stroke-width': 1.5 }, svg); });
        if (c.etiquetaFin) { var u = c.puntos[c.puntos.length - 1]; texto(svg, X(u[0]) + 6, Y(u[1]) + 4, c.etiquetaFin, 'g-nota'); }
      }
    });
    leyenda(p, series);
    if (o.esquina) texto(svg, mg.l + pw - 4, mg.t + 13, o.esquina, 'g-esquina', 'end');
    if (o.esquina2) texto(svg, mg.l + pw - 4, mg.t + 29, o.esquina2, 'g-esquina2', 'end');

    // marcas verticales con etiqueta
    (o.marcasX || []).forEach(function (m) {
      if (m.x < o.x.min || m.x > o.x.max) return;
      var yTop = m.texto ? 10 + (m.nivel || 0) * 18 + 4 : mg.t;
      s('line', { x1: X(m.x), x2: X(m.x), y1: yTop, y2: mg.t + ph, stroke: m.color || '#394049', 'stroke-width': 1.5 }, svg);
      if (m.texto) {
        var t = texto(svg, X(m.x) + 6, yTop + 8, m.texto, 'g-marca', 'start'), tw = t.getComputedTextLength();
        if (X(m.x) + 6 + tw > W - 2) {
          if (X(m.x) - 6 - tw >= 2) { t.setAttribute('x', X(m.x) - 6); t.setAttribute('text-anchor', 'end'); }
          else { t.setAttribute('x', W - 2); t.setAttribute('text-anchor', 'end'); }
        }
      }
    });

    // lectura con cursor o teclado
    if (o.lectura && o.puntosX) {
      var hair = s('line', { y1: mg.t, y2: mg.t + ph, 'class': 'g-cruz', visibility: 'hidden' }, svg);
      var puntos = s('g', {}, svg), idx = -1;
      var mover = function (i, cx, cy) {
        idx = Math.max(0, Math.min(o.puntosX.length - 1, i));
        var xv = o.puntosX[idx], px = X(xv);
        hair.setAttribute('x1', px); hair.setAttribute('x2', px); hair.setAttribute('visibility', 'visible');
        puntos.textContent = '';
        o.capas.forEach(function (c) {
          if (c.tipo !== 'linea') return;
          var pt = c.puntos[idx];
          if (pt && pt[0] === xv && pt[1] <= o.y.max) s('circle', { cx: px, cy: Y(pt[1]), r: 4, fill: c.color, stroke: '#fff', 'stroke-width': 2 }, puntos);
        });
        var caja = svg.getBoundingClientRect();
        mostrarTip(cx != null ? cx : caja.left + px, cy != null ? cy : caja.top + mg.t + 20, o.lectura(xv, idx));
      };
      var capa = s('rect', { x: mg.l, y: mg.t, width: pw, height: ph, fill: 'transparent' }, svg);
      var cercano = function (ev) {
        var caja = svg.getBoundingClientRect(), xv = o.x.min + (ev.clientX - caja.left - mg.l) / pw * (o.x.max - o.x.min), best = 0, dmin = Infinity;
        for (var i = 0; i < o.puntosX.length; i++) { var dd = Math.abs(o.puntosX[i] - xv); if (dd < dmin) { dmin = dd; best = i; } }
        return best;
      };
      capa.addEventListener('pointermove', function (ev) { mover(cercano(ev), ev.clientX, ev.clientY); });
      capa.addEventListener('pointerdown', function (ev) { mover(cercano(ev), ev.clientX, ev.clientY); });
      var salir = function () { hair.setAttribute('visibility', 'hidden'); puntos.textContent = ''; ocultarTip(); };
      capa.addEventListener('pointerleave', salir);
      svg.addEventListener('blur', salir);
      svg.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); mover((idx < 0 ? (o.inicioTeclado || 0) : idx) + (ev.key === 'ArrowRight' ? 1 : -1)); }
        else if (ev.key === 'Escape') salir();
      });
    }
    tabla(p, o.tabla);
  }

  /* ---------- Graf.filas: barras horizontales, barras agrupadas o punto con intervalo ---------- */
  function filas(fig, o) {
    var p = partes(fig), W = p.plot.clientWidth;
    if (W < 60) return;
    p.plot.textContent = '';
    var estrecho = W < 520, wEt = estrecho ? Math.min(o.anchoEtiqueta || 190, W * 0.38) : (o.anchoEtiqueta || 190);
    var nSer = o.series ? o.series.length : 1, altoFila = o.altoFila || (nSer > 1 ? 40 : 30), altoGrupo = 28;
    var mg = { l: wEt + 10, r: estrecho ? Math.min(o.margenDer || 64, 70) : (o.margenDer || 64), t: 6, b: o.x.titulo ? 44 : 26 };
    var nGrupos = 0, prev = null;
    o.filas.forEach(function (f) { if (f.grupo && f.grupo !== prev) { nGrupos++; prev = f.grupo; } });
    var ph = o.filas.length * altoFila + nGrupos * altoGrupo, H = mg.t + ph + mg.b, pw = W - mg.l - mg.r;
    var X = function (v) { return mg.l + (v - o.x.min) / (o.x.max - o.x.min) * pw; };
    var svg = s('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.descripcion || 'Gráfico' }, p.plot);
    var tx = o.x.marcas || marcasEje(o.x.min, o.x.max, estrecho ? 1 : 6);
    tx.forEach(function (v) {
      s('line', { x1: X(v), x2: X(v), y1: mg.t, y2: mg.t + ph, 'class': v === 0 ? 'g-base' : 'g-rejilla' }, svg);
      texto(svg, X(v), mg.t + ph + 17, o.x.fmt(v), 'g-eje', 'middle');
    });
    (o.refX || []).forEach(function (r) {
      s('line', { x1: X(r.x), x2: X(r.x), y1: mg.t, y2: mg.t + ph, 'class': 'g-ref' }, svg);
    });
    if (o.x.titulo) texto(svg, estrecho ? W / 2 : mg.l + pw / 2, H - 6, o.x.titulo, 'g-titulo-eje', 'middle');
    var y = mg.t; prev = null;
    var colores = o.series ? o.series.map(function (se) { return se.color; }) : [o.color || '#E77500'];
    o.filas.forEach(function (f) {
      if (f.grupo && f.grupo !== prev) {
        s('rect', { x: 0, y: y + 1, width: W, height: altoGrupo - 2, fill: '#fff' }, svg);
        texto(svg, 0, y + 19, f.grupo, 'g-grupo');
        y += altoGrupo; prev = f.grupo;
      }
      var g = s('g', { tabindex: '0', 'class': 'g-fila' }, svg);
      var fondo = s('rect', { x: 0, y: y, width: W, height: altoFila, 'class': 'g-fondo' }, g);
      var et = texto(g, wEt, y + altoFila / 2 + 4, f.etiqueta, 'g-etiqueta' + (f.destacada ? ' g-fuerte' : ''), 'end');
      if (et.getComputedTextLength() > wEt - 2) { et.setAttribute('textLength', wEt - 4); et.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      var cy = y + altoFila / 2;
      if (o.tipo === 'caja') {
        s('line', { x1: X(f.p10), x2: X(f.p90), y1: cy, y2: cy, stroke: '#7C8792', 'stroke-width': 1.5 }, g);
        s('line', { x1: X(f.p10), x2: X(f.p10), y1: cy - 4, y2: cy + 4, stroke: '#7C8792', 'stroke-width': 1.5 }, g);
        s('line', { x1: X(f.p90), x2: X(f.p90), y1: cy - 4, y2: cy + 4, stroke: '#7C8792', 'stroke-width': 1.5 }, g);
        s('rect', { x: X(f.p25), y: cy - 8, width: Math.max(1, X(f.p75) - X(f.p25)), height: 16, rx: 3, fill: colores[0], opacity: 0.85 }, g);
        s('line', { x1: X(f.p50), x2: X(f.p50), y1: cy - 10, y2: cy + 10, stroke: '#1D2228', 'stroke-width': 2.5 }, g);
      } else if (o.tipo === 'rango') {
        s('line', { x1: X(f.inf), x2: X(f.sup), y1: cy, y2: cy, stroke: colores[0], 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
        s('circle', { cx: X(f.valor), cy: cy, r: 5, fill: colores[0], stroke: '#fff', 'stroke-width': 2 }, g);
        if (o.etiquetaValor) texto(g, X(Math.max(f.sup, f.valor)) + 8, cy + 4, o.etiquetaValor(f), 'g-valor');
      } else {
        var vals = f.valores || [f.valor], grosor = nSer > 1 ? 10 : 12, total = vals.length * grosor + (vals.length - 1) * 2, y0 = cy - total / 2;
        vals.forEach(function (v, i) {
          var x0 = X(Math.min(0, v)), w = Math.abs(X(v) - X(0));
          if (w > 0.5) s('path', { d: barraRedondeada(x0, y0 + i * (grosor + 2), w, grosor, 4, v >= 0 ? 'derecha' : 'izquierda'), fill: colores[i] }, g);
          if (o.etiquetaValor && nSer === 1) texto(g, X(Math.max(0, v)) + 6, cy + 4, o.etiquetaValor(f), 'g-valor');
        });
      }
      if (o.lectura) {
        var ver = function (ev) {
          var caja = fondo.getBoundingClientRect();
          mostrarTip(ev && ev.clientX ? ev.clientX : caja.left + wEt + 40, ev && ev.clientY ? ev.clientY : caja.top, o.lectura(f));
        };
        g.addEventListener('pointermove', ver);
        g.addEventListener('pointerleave', ocultarTip);
        g.addEventListener('focus', function () { ver(null); });
        g.addEventListener('blur', ocultarTip);
      }
      y += altoFila;
    });
    leyenda(p, o.series ? o.series.map(function (se) { return { nombre: se.nombre, color: se.color, forma: 'caja' }; }) : null);
    tabla(p, o.tabla);
  }

  window.Graf = { xy: xy, filas: filas, ocultarTip: ocultarTip };
})();
