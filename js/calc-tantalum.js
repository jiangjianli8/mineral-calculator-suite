// js/calc-tantalum.js
(function(window) {
  'use strict';

  var C = window.MCSCommon;
  var BaseCalc = window.BaseCalc;
  var LBS_PER_TON = 2204.6226;

  function TantalumCalc() {
    BaseCalc.call(this, {
      id: 'tantalum',
      name: '钽铌矿',
      theme: { primary: '#9c27b0', accent: '#e040fb', icon: '💎', tag: 'Ta₂O₅+Nb₂O₅ · CIF' },
      fields: [
        { id: 'grade', label: '钽铌矿品位', unit: '%', min: 1, max: 50, step: 0.1, default: 30 },
        { id: 'vatRate', label: '增值税率', unit: '%', min: 0, max: 20, step: 0.5, default: 13 },
        { id: 'exchangeRate', label: '汇率 USD/CNY', unit: '', min: 6.5, max: 8.0, step: 0.0001, default: 7.25 }
      ]
    });
    this.intlPrice = 232.5; // USD/lb
    this.exchangeRate = 7.25;
  }

  TantalumCalc.prototype = Object.create(BaseCalc.prototype);
  TantalumCalc.prototype.constructor = TantalumCalc;

  TantalumCalc.prototype.fetchPrice = function() {
    var self = this;
    fetch('data/price.json?_=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.intl_price && d.intl_price > 0) self.intlPrice = d.intl_price;
        if (d.exchange_rate && d.exchange_rate > 0) self.exchangeRate = d.exchange_rate;
        self.updatePriceDisplay();
        self.autoCalc();
      })
      .catch(function() {
        self.fetchLiveFX();
      });
  };

  TantalumCalc.prototype.fetchLiveFX = function() {
    var self = this;
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.rates && d.rates.CNY > 0) self.exchangeRate = d.rates.CNY;
        self.updatePriceDisplay(true);
        self.autoCalc();
      })
      .catch(function() {
        self.updatePriceDisplay(true);
        self.autoCalc();
      });
  };

  TantalumCalc.prototype.updatePriceDisplay = function(offline) {
    var el = this.el.querySelector('.price-value');
    if (!el) return;
    var label = this.el.querySelector('.price-name');
    if (label) label.textContent = '国际钽铌矿 CIF';
    if (offline) {
      el.innerHTML = '<span class="offline">$' + C.fmt(this.intlPrice, 1) + '</span><span class="unit">/磅</span>';
    } else {
      el.innerHTML = '$' + C.fmt(this.intlPrice, 1) + '<span class="unit">/磅</span>';
    }
    var meta = this.el.querySelector('.price-time');
    if (meta) meta.textContent = (offline ? '离线 · ' : '') + '汇率 ' + this.exchangeRate.toFixed(4);
  };

  TantalumCalc.prototype.calcTotal = function(inputs) {
    var fxRate = inputs.exchangeRate || this.exchangeRate;
    var cif = this.intlPrice * LBS_PER_TON * (inputs.grade / 100);
    var pretax = cif * fxRate;
    var aftertax = pretax * (1 + inputs.vatRate / 100);
    var td = inputs.grade > 0 ? aftertax / inputs.grade : 0;
    return {
      cif: '$' + C.formatMoney(cif) + ' /吨',
      pretax: '¥' + C.formatMoney(pretax) + ' /吨',
      aftertax: '¥' + C.formatMoney(aftertax) + ' /吨',
      tonDegree: '¥' + C.formatMoney(td) + ' /吨度',
      formula: 'CIF = ' + this.intlPrice + '$/磅 × 2204.62 × ' + inputs.grade + '%; 税后 = CIF × ' + fxRate.toFixed(4) + ' × (1+' + inputs.vatRate + '%)'
    };
  };

  TantalumCalc.prototype.renderResults = function(results, inputs) {
    var html = '<div class="result-list">' +
      '<div class="result-item"><span class="r-label">CIF 到岸价</span><span class="r-value">' + results.cif + '</span></div>' +
      '<div class="result-item"><span class="r-label">国内税前价</span><span class="r-value">' + results.pretax + '</span></div>' +
      '<div class="result-item highlight"><span class="r-label">国内税后价</span><span class="r-value">' + results.aftertax + '</span></div>' +
      '<div class="result-item"><span class="r-label">吨度价</span><span class="r-value">' + results.tonDegree + '</span></div>' +
    '</div>' +
    '<div class="formula">' + results.formula + '</div>';
    this.el.querySelector('.result-area').innerHTML = html;
  };

  window.TantalumCalc = TantalumCalc;
})(window);
