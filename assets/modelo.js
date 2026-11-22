/* Distribuciones SMN y TP-SMN con la parametrización de la tesis (mismas expresiones que 00_funciones.R).
   Error TP-SMN con moda 0: g(e) = (1/σ) f0(e / (σ(1 − α s))),  s = +1 si e > 0 y −1 si e ≤ 0.
   G(e) = (1 + α) F0(e / (σ(1 + α)))           si e ≤ 0
   G(e) = 1 − (1 − α) [1 − F0(e / (σ(1 − α)))] si e > 0                                   */
(function () {
  'use strict';
  var RAIZ2PI = Math.sqrt(2 * Math.PI);

  function lgamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5, s = 1.000000000190015;
    t -= (x + 0.5) * Math.log(t);
    for (var j = 0; j < 6; j++) { y += 1; s += c[j] / y; }
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  function fraccionBeta(a, b, x) {
    var MIN = 1e-300, qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < MIN) d = MIN;
    d = 1 / d; var h = d;
    for (var m = 1; m <= 400; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < MIN) d = MIN;
      c = 1 + aa / c; if (Math.abs(c) < MIN) c = MIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < MIN) d = MIN;
      c = 1 + aa / c; if (Math.abs(c) < MIN) c = MIN;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }
  function betaInc(a, b, x) {            // I_x(a, b)
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * fraccionBeta(a, b, x) / a : 1 - bt * fraccionBeta(b, a, 1 - x) / b;
  }
  function gammaP(a, x) {                // P(a, x) regularizada
    if (x <= 0) return 0;
    var gln = lgamma(a), i;
    if (x < a + 1) {
      var ap = a, sum = 1 / a, del = sum;
      for (i = 0; i < 1000; i++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 3e-15) break; }
      return sum * Math.exp(-x + a * Math.log(x) - gln);
    }
    var b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (i = 1; i < 1000; i++) {
      var an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; var dl = d * c; h *= dl;
      if (Math.abs(dl - 1) < 3e-15) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
  }
  function erfc(x) {                      // error relativo < 1,2e-7
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
      t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function normCdf(z) { return 0.5 * erfc(-z / Math.SQRT2); }
  function normPdf(z) { return Math.exp(-0.5 * z * z) / RAIZ2PI; }
  function normQ(p) {                     // Acklam, con un paso de Newton
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239],
      b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1],
      c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416], q, r, x;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    var e = normCdf(x) - p; return x - e * RAIZ2PI * Math.exp(0.5 * x * x) / (1 + x * e * RAIZ2PI * Math.exp(0.5 * x * x) / 2);
  }

  // ----- densidad estándar f0(z) de las cinco distribuciones SMN (par = {nu, tau})
  function f0(fam, z, par) {
    var z2 = z * z, nu = par && par.nu, tau = par && par.tau;
    if (fam === 'N') return Math.exp(-0.5 * z2) / RAIZ2PI;
    if (fam === 'T') return Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(Math.PI * nu) - (nu + 1) / 2 * Math.log(1 + z2 / nu));
    if (fam === 'SL') {
      if (z2 < 1e-8) return 2 * nu / (2 * nu + 1) / RAIZ2PI;
      return Math.exp(Math.log(nu) + (nu + 0.5) * Math.log(2 / z2) + lgamma(nu + 0.5)) * gammaP(nu + 0.5, z2 / 2) / RAIZ2PI;
    }
    if (fam === 'CN') return (nu * Math.sqrt(tau) * Math.exp(-0.5 * tau * z2) + (1 - nu) * Math.exp(-0.5 * z2)) / RAIZ2PI;
    var e = Math.exp(-Math.abs(z)); return e / ((1 + e) * (1 + e));          // logística
  }
  // ----- F0(z), o la cola superior 1 − F0(z) si sup es verdadero
  function F0(fam, z, par, sup) {
    var s = sup ? -1 : 1, nu = par && par.nu, tau = par && par.tau;
    if (fam === 'N') return normCdf(s * z);
    if (fam === 'T') {
      var cola = 0.5 * betaInc(nu / 2, 0.5, nu / (nu + z * z));       // P(T > |z|)
      if (!sup) return z > 0 ? 1 - cola : cola;
      return z > 0 ? cola : 1 - cola;
    }
    if (fam === 'L') return 1 / (1 + Math.exp(-s * z));
    if (fam === 'CN') return nu * normCdf(s * Math.sqrt(tau) * z) + (1 - nu) * normCdf(s * z);
    var corr = z * f0('SL', z, par) / (2 * nu);                           // slash
    return sup ? normCdf(-z) + corr : normCdf(z) - corr;
  }
  function F0inv(fam, p, par) {
    if (fam === 'N') return normQ(p);
    var lo = -1, hi = 1, k = 0;
    while (F0(fam, lo, par) > p && k++ < 200) lo *= 2;
    k = 0; while (F0(fam, hi, par) < p && k++ < 200) hi *= 2;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      if (F0(fam, mid, par) < p) lo = mid; else hi = mid;
      if (hi - lo < 1e-11 * Math.max(1, Math.abs(mid))) break;
    }
    return (lo + hi) / 2;
  }
  // ----- d1 = E|Z0| (Infinity si no es finito)
  function d1(fam, par) {
    var nu = par && par.nu, tau = par && par.tau;
    if (fam === 'N') return Math.sqrt(2 / Math.PI);
    if (fam === 'T') return nu > 1 ? Math.sqrt(nu / Math.PI) * Math.exp(lgamma((nu - 1) / 2) - lgamma(nu / 2)) : Infinity;
    if (fam === 'SL') return nu > 0.5 ? Math.sqrt(2 / Math.PI) * 2 * nu / (2 * nu - 1) : Infinity;
    if (fam === 'CN') return Math.sqrt(2 / Math.PI) * (nu / Math.sqrt(tau) + 1 - nu);
    return 2 * Math.log(2);
  }
  // varianza finita (k2 < ∞)
  function varFinita(fam, par) {
    if (fam === 'T') return par.nu > 2;
    if (fam === 'SL') return par.nu > 1;
    return true;
  }

  // ----- error TP-SMN con moda 0, escala sigma y asimetría alpha
  function tp(fam, sigma, alpha, par) {
    var bajo = sigma * (1 + alpha), sobre = sigma * (1 - alpha);
    var o = {
      fam: fam, sigma: sigma, alpha: alpha, par: par, escBajo: bajo, escSobre: sobre,
      dens: function (e) { return f0(fam, e / (e > 0 ? sobre : bajo), par) / sigma; },
      cdf: function (e) { return e <= 0 ? (1 + alpha) * F0(fam, e / bajo, par) : 1 - (1 - alpha) * F0(fam, e / sobre, par, true); },
      sup: function (e) { return e > 0 ? (1 - alpha) * F0(fam, e / sobre, par, true) : 1 - (1 + alpha) * F0(fam, e / bajo, par); },
      cuantil: function (p) {
        return p <= (1 + alpha) / 2 ? bajo * F0inv(fam, p / (1 + alpha), par) : sobre * F0inv(fam, 1 - (1 - p) / (1 - alpha), par);
      },
      media: function () { var m = d1(fam, par); return isFinite(m) ? -2 * alpha * sigma * m : Infinity; },
      pesoT: function (e) { var z = e / (e > 0 ? sobre : bajo); return (par.nu + 1) / (par.nu + z * z); }
    };
    return o;
  }

  window.M = { lgamma: lgamma, betaInc: betaInc, gammaP: gammaP, normCdf: normCdf, normPdf: normPdf, normQ: normQ,
    f0: f0, F0: F0, F0inv: F0inv, d1: d1, varFinita: varFinita, tp: tp };
})();
