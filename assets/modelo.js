/* Distribución t de dos piezas (TP-t) en la parametrización de la tesis:
   densidad g(y) = (1/σ) f_t(z | ν),  z = (y − μ) / (σ (1 − α s)),  s = +1 si y > μ y −1 si y ≤ μ.
   μ es la moda, (1 + α)/2 la proporción bajo la moda. Mismas fórmulas que el código en R. */
(function () {
  'use strict';

  function lgamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5, s = 1.000000000190015;
    t -= (x + 0.5) * Math.log(t);
    for (var j = 0; j < 6; j++) { y += 1; s += c[j] / y; }
    return -t + Math.log(2.5066282746310005 * s / x);
  }

  function fraccionBeta(a, b, x) {
    var MAX = 400, EPS = 3e-14, MIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < MIN) d = MIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAX; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < MIN) d = MIN;
      c = 1 + aa / c; if (Math.abs(c) < MIN) c = MIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < MIN) d = MIN;
      c = 1 + aa / c; if (Math.abs(c) < MIN) c = MIN;
      d = 1 / d;
      var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  // Función beta incompleta regularizada I_x(a, b)
  function betaInc(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * fraccionBeta(a, b, x) / a : 1 - bt * fraccionBeta(b, a, 1 - x) / b;
  }

  function densidadT(t, nu) {
    return Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(Math.PI * nu) - (nu + 1) / 2 * Math.log(1 + t * t / nu));
  }

  // P(T ≤ t); colaSuperior = true entrega P(T > t)
  function acumuladaT(t, nu, colaSuperior) {
    var cola = 0.5 * betaInc(nu / 2, 0.5, nu / (nu + t * t));
    var inferior = t > 0 ? 1 - cola : cola;
    if (!colaSuperior) return inferior;
    return t > 0 ? cola : 1 - cola;
  }

  function cuantilT(p, nu) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var lo = -1, hi = 1;
    while (acumuladaT(lo, nu) > p) lo *= 2;
    while (acumuladaT(hi, nu) < p) hi *= 2;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      if (acumuladaT(mid, nu) < p) lo = mid; else hi = mid;
      if (hi - lo < 1e-12 * Math.max(1, Math.abs(mid))) break;
    }
    return (lo + hi) / 2;
  }

  function crear(par) {
    var sigma = Math.sqrt(par.sigma2), alpha = par.alpha, nu = par.nu;
    var escIzq = sigma * (1 + alpha), escDer = sigma * (1 - alpha);
    return {
      sigma: sigma, alpha: alpha, nu: nu, escIzq: escIzq, escDer: escDer,
      // moda condicional (millones de pesos) de un perfil
      moda: function (p) {
        return par.intercepto + par.nivel[p.nivel] + par.edad * p.edad + par.horas * p.horas +
          (p.sexo === 'Hombre' ? par.hombre : 0) + par.tam[p.tam];
      },
      // densidad del sueldo y (millones) con moda mu
      densidad: function (y, mu) {
        var r = y - mu;
        return densidadT(r / (r > 0 ? escDer : escIzq), nu) / sigma;
      },
      // P(Y ≤ y)
      acumulada: function (y, mu) {
        var r = y - mu;
        return r <= 0 ? (1 + alpha) * acumuladaT(r / escIzq, nu) : alpha + (1 - alpha) * acumuladaT(r / escDer, nu);
      },
      // P(Y > y), calculada con la cola superior
      supera: function (y, mu) {
        var r = y - mu;
        return r > 0 ? (1 - alpha) * acumuladaT(r / escDer, nu, true) : 1 - (1 + alpha) * acumuladaT(r / escIzq, nu);
      },
      // cuantil de orden p, como distancia a la moda (millones)
      cuantil: function (p) {
        return p <= (1 + alpha) / 2 ? escIzq * cuantilT(p / (1 + alpha), nu) : escDer * cuantilT((p - alpha) / (1 - alpha), nu);
      },
      // peso de una observación a distancia r de la moda (millones)
      peso: function (r) {
        var z = r / (r > 0 ? escDer : escIzq);
        return (nu + 1) / (nu + z * z);
      },
      // distancias a la moda en que el peso baja de 1/2
      umbralPeso: function () {
        var z = Math.sqrt(nu + 2);
        return { izq: -z * escIzq, der: z * escDer };
      }
    };
  }

  window.Modelo = { crear: crear, acumuladaT: acumuladaT, cuantilT: cuantilT, densidadT: densidadT };
})();
