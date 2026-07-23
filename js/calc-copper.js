// js/calc-copper.js
(function(window) {
  'use strict';

  var C = window.MCSCommon;
  var BaseCalc = window.BaseCalc;

  var COEFF_TABLE = [
    [2,40],[3,55],[4,65],[5,73],[6,76],[7,79],[8,82],[9,83],[10,85],
    [11,86],[12,87],[13,88],[14,88.5],[15,89],[16,89],[17,90],[18,91],[19,92],[20,93],[21,95]
  ];

  function getCoefficient(grade) {
    if (grade < 2) return 0;
    if (grade >= 21) return 95;
    for (var i = 0; i < COEFF_TABLE.length - 1; i++) {
      var g1 = COEFF_TABLE[i][0], c1 = COEFF_TABLE[i][1];
      var g2 = COEFF_TABLE[i+1][0], c2 = COEFF_TABLE[i+1][1];
      if (grade >= g1 && grade < g2) {
        var t = (grade - g1) / (g2 - g1);
        return c1 + t * (c2 - c1);
      }
    }
    return 95;
  }

  function CopperCalc() {
    BaseCalc.call(this, {
      id: 'copper',
      name: '铜矿石',
      theme: { primary: '#ff6b35', accent: '#ffd700', icon: '🔶', tag: 'Cu · SMM 1#电解铜' },
      fields: [
        { id: 'grade', label: '铜品位 Cu', unit: '%', min: 2, max: 21, step: 0.1, default: 5 }
      ]
    });
    this.price = 101570;
  }

  CopperCalc.prototype = Object.create(BaseCalc.prototype);
  CopperCalc.prototype.constructor = CopperCalc;

  CopperCalc.prototype.updatePriceDisplay = function(offline) {
    var el = this.el.querySelector('.price-value');
    if (!el) return;
    var label = this.el.querySelector('.price-name');
    if (label) label.textContent = 'SMM 1#电解铜';
    if (offline) {
      el.innerHTML = '<span class="offline">离线 · ' + C.fmt(this.price, 0) + '</span><span class="unit">元/吨</span>';
    } else {
      el.innerHTML = C.fmt(this.price, 0) + '<span class="unit">元/吨</span>';
    }
  };

  CopperCalc.prototype.calcTotal = function(inputs) {
    var coeff = getCoefficient(inputs.grade);
    var orePrice = this.price * (inputs.grade / 100) * (coeff / 100);
    return {
      coeff: C.formatPercent(coeff),
      orePrice: '¥' + C.fmt(orePrice, 0) + ' /吨',
      formula: this.price.toLocaleString() + ' × ' + inputs.grade.toFixed(1) + '% × ' + coeff.toFixed(2) + '% = ' + C.fmt(orePrice, 0) + ' 元/吨'
    };
  };

  CopperCalc.prototype.renderResults = function(results, inputs) {
    var html = '<div class="result-main"><span class="rm-label">铜矿石单价</span><span class="rm-value">' + results.orePrice + '</span></div>' +
      '<div class="result-sub"><span>计价系数</span><span>' + results.coeff + '</span></div>' +
      '<div class="formula">' + results.formula + '</div>';
    this.el.querySelector('.result-area').innerHTML = html;
  };

  window.CopperCalc = CopperCalc;
})(window);
