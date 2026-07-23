// js/calc-spodumene.js
(function(window) {
  'use strict';

  var C = window.MCSCommon;
  var BaseCalc = window.BaseCalc;

  var TIERS = [
    { lo: 2, hi: 2.99, d: 26000, label: '2.0%-2.99%', cls: 'tag-1' },
    { lo: 3, hi: 3.49, d: 32000, label: '3.0%-3.49%', cls: 'tag-2' },
    { lo: 3.5, hi: 3.99, d: 28500, label: '3.5%-3.99%', cls: 'tag-3' },
    { lo: 4, hi: 4.49, d: 27000, label: '4.0%-4.49%', cls: 'tag-4' },
    { lo: 4.5, hi: 4.99, d: 24000, label: '4.5%-4.99%', cls: 'tag-5' },
    { lo: 5, hi: 99.99, d: 23000, label: '>=5.0%', cls: 'tag-6' }
  ];

  function SpodumeneCalc() {
    BaseCalc.call(this, {
      id: 'spodumene',
      name: '锂辉石',
      theme: { primary: '#9b00ff', accent: '#00f0ff', icon: '⚡', tag: 'Li₂O · 广期所 LC' },
      priceSource: {
        proxy: 'https://lc.fsxsymall.com/lc',
        fallback: 'data/price.json'
      },
      fields: [
        { id: 'lio2', label: 'Li₂O 品位', unit: '%', min: 2, max: 100, step: 0.1, default: 5.0 },
        { id: 'recovery', label: '回收率', unit: '%', min: 0, max: 100, step: 0.1, default: 85 },
        { id: 'deduction', label: '扣减基准 D', unit: 'CNY/吨', min: 0, step: 100, default: 23000 }
      ]
    });
    this.price = 80000;
  }

  SpodumeneCalc.prototype = Object.create(BaseCalc.prototype);
  SpodumeneCalc.prototype.constructor = SpodumeneCalc;

  SpodumeneCalc.prototype.fetchPrice = function() {
    var self = this;
    var proxy = this.priceSource.proxy + '?_=' + Date.now();
    fetch(proxy)
      .then(function(r) { if (!r.ok) throw new Error('x'); return r.json(); })
      .then(function(d) {
        if (d.price) {
          self.price = d.price;
          self.updatePriceDisplay();
          self.autoCalc();
        }
      })
      .catch(function() {
        fetch(self.priceSource.fallback + '?_=' + Date.now())
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (!self.manualPrice && d.price > 0) self.price = d.price;
            self.updatePriceDisplay(true);
            self.autoCalc();
          })
          .catch(function() {
            self.price = self.price || 80000;
            self.updatePriceDisplay(true);
            self.autoCalc();
          });
      });
  };

  SpodumeneCalc.prototype.updatePriceDisplay = function(offline) {
    var el = this.el.querySelector('.price-value');
    if (!el) return;
    var label = this.el.querySelector('.price-name');
    if (label) label.textContent = '广期所 LC 碳酸锂';
    if (offline) {
      el.innerHTML = '<span class="offline">离线 · ' + C.fmt(this.price, 0) + '</span><span class="unit">元/吨</span>';
    } else {
      el.innerHTML = C.fmt(this.price, 0) + '<span class="unit">元/吨</span>';
    }
    this.el.querySelector('.price-bar .dot').className = 'dot ' + (offline ? 'offline' : '');
  };

  SpodumeneCalc.prototype.calcTotal = function(inputs) {
    var price = this.price || 0;
    var h = 30 / 74 / (inputs.recovery / 100) / (inputs.lio2 / 100);
    var dmt = (price - inputs.deduction) / h;
    var exchangeRate = (window.globalConfig && window.globalConfig.exchangeRate) || 7.2;
    return {
      h: h.toFixed(4),
      dmt: '¥' + C.formatMoney(dmt),
      dunPrice: '¥' + C.formatMoney(dmt / inputs.lio2),
      usd: '$' + C.formatMoney(dmt / exchangeRate),
      formula: 'H = 30÷74÷回收率÷品位; DMT = (LC' + C.fmt(price, 0) + ' - D' + C.fmt(inputs.deduction, 0) + ') ÷ H'
    };
  };

  SpodumeneCalc.prototype.renderResults = function(results, inputs) {
    var html = '<div class="result-grid">' +
      '<div class="result-box"><span class="rb-label">H 系数</span><span class="rb-value">' + results.h + '</span></div>' +
      '<div class="result-box highlight"><span class="rb-label">DMT 单价</span><span class="rb-value">' + results.dmt + '</span></div>' +
      '<div class="result-box"><span class="rb-label">吨度价</span><span class="rb-value">' + results.dunPrice + '</span></div>' +
      '<div class="result-box"><span class="rb-label">折合美元</span><span class="rb-value">' + results.usd + '</span></div>' +
    '</div>' +
    '<div class="formula">' + results.formula + '</div>';
    this.el.querySelector('.result-area').innerHTML = html;
  };

  window.SpodumeneCalc = SpodumeneCalc;
})(window);
