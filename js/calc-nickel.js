// js/calc-nickel.js
(function(window) {
  'use strict';

  var C = window.MCSCommon;
  var BaseCalc = window.BaseCalc;

  var LATERITE_COEFF = [[0.5,75],[0.8,78],[1.0,80],[1.2,82],[1.4,84],[1.5,85],[1.6,86],[1.7,87],[1.8,88],[2.0,89],[2.2,90],[2.5,91],[3.0,92]];
  var SULFIDE_COEFF = [[0.5,80],[0.8,83],[1.0,85],[1.2,87],[1.4,88],[1.5,89],[1.6,90],[1.7,90],[1.8,91],[2.0,92],[2.2,93],[2.5,94],[3.0,95]];

  function getCoeff(table, grade) {
    if (grade <= table[0][0]) return table[0][1];
    if (grade >= table[table.length-1][0]) return table[table.length-1][1];
    for (var i = 0; i < table.length - 1; i++) {
      if (grade >= table[i][0] && grade <= table[i+1][0]) {
        var t = (grade - table[i][0]) / (table[i+1][0] - table[i][0]);
        return table[i][1] + t * (table[i+1][1] - table[i][1]);
      }
    }
    return table[table.length-1][1];
  }

  function NickelCalc() {
    BaseCalc.call(this, {
      id: 'nickel',
      name: '镍矿石',
      theme: { primary: '#50c878', accent: '#a0ffc0', icon: '💚', tag: 'Ni · SMM 1#电解镍' },
      fields: []
    });
    this.price = 127250;
    this.oreType = 'laterite';
  }

  NickelCalc.prototype = Object.create(BaseCalc.prototype);
  NickelCalc.prototype.constructor = NickelCalc;

  NickelCalc.prototype.updatePriceDisplay = function(offline) {
    var el = this.el.querySelector('.price-value');
    if (!el) return;
    var label = this.el.querySelector('.price-name');
    if (label) label.textContent = 'SMM 1#电解镍';
    if (offline) {
      el.innerHTML = '<span class="offline">离线 · ' + C.fmt(this.price, 0) + '</span><span class="unit">元/吨</span>';
    } else {
      el.innerHTML = C.fmt(this.price, 0) + '<span class="unit">元/吨</span>';
    }
  };

  NickelCalc.prototype.renderInputs = function() {
    return '<div class="field">' +
      '<label>矿石类型</label>' +
      '<div class="segmented" data-field="oreType">' +
        '<button data-value="laterite" class="active">红土镍矿</button>' +
        '<button data-value="sulfide">硫化镍矿</button>' +
      '</div>' +
    '</div>' +
    '<div class="field"><label>镍品位 Ni <span>%</span></label><div class="input-wrap"><input type="number" id="nickel_grade" data-field="grade" value="1.8" min="0.5" max="3.0" step="0.05"><span class="suffix">%</span></div></div>' +
    '<div class="field"><label>冶炼加工费 TC <span>元/吨</span></label><div class="input-wrap"><input type="number" id="nickel_tc" data-field="tc" value="800" min="0" max="5000" step="50"><span class="suffix">元/吨</span></div></div>' +
    '<div class="two-col">' +
      '<div class="field"><label>汇率 USD/CNY</label><div class="input-wrap"><input type="number" id="nickel_exchangeRate" data-field="exchangeRate" value="7.25" min="6.5" max="8.0" step="0.01"></div></div>' +
      '<div class="field"><label>水分 H₂O <span>%</span></label><div class="input-wrap"><input type="number" id="nickel_moisture" data-field="moisture" value="35" min="20" max="45" step="1"><span class="suffix">%</span></div></div>' +
    '</div>' +
    '<div class="field switch-field"><label>含税模式 (÷1.13)</label><label class="switch"><input type="checkbox" id="nickel_taxMode" checked><span class="slider"></span></label></div>';
  };

  NickelCalc.prototype.bindInputs = function() {
    var self = this;
    var allInputs = this.el.querySelectorAll('input');
    allInputs.forEach(function(el) {
      el.addEventListener('input', function() { self.autoCalc(); });
      el.addEventListener('change', function() { self.autoCalc(); self.saveDraft(); });
    });
    this.el.querySelector('.segmented').addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON') {
        self.el.querySelectorAll('.segmented button').forEach(function(b) { b.classList.remove('active'); });
        e.target.classList.add('active');
        self.oreType = e.target.dataset.value;
        self.autoCalc();
        self.saveDraft();
      }
    });
  };

  NickelCalc.prototype.getInputs = function() {
    var oreTypeBtn = this.el.querySelector('.segmented button.active');
    var oreType = oreTypeBtn ? oreTypeBtn.dataset.value : 'laterite';
    return {
      oreType: oreType,
      grade: parseFloat(this.el.querySelector('#nickel_grade').value) || 1.8,
      tc: parseFloat(this.el.querySelector('#nickel_tc').value) || 800,
      exchangeRate: parseFloat(this.el.querySelector('#nickel_exchangeRate').value) || 7.25,
      moisture: parseFloat(this.el.querySelector('#nickel_moisture').value) || 35,
      taxMode: this.el.querySelector('#nickel_taxMode').checked ? 1 : 0
    };
  };

  NickelCalc.prototype.calcTotal = function(inputs) {
    var table = inputs.oreType === 'laterite' ? LATERITE_COEFF : SULFIDE_COEFF;
    var coeff = getCoeff(table, inputs.grade);
    var divider = inputs.taxMode ? 1.13 : 1;
    var metalValue;
    if (inputs.oreType === 'laterite') {
      metalValue = (this.price / divider) * (inputs.grade / 100) * (coeff / 100) * (1 - inputs.moisture / 100);
    } else {
      metalValue = (this.price / divider) * (inputs.grade / 100) * (coeff / 100);
    }
    var orePrice = Math.max(0, metalValue - inputs.tc);
    return {
      coeff: C.formatPercent(coeff),
      orePrice: '¥' + C.fmt(orePrice, 0) + ' /吨',
      formula: 'SMM ' + this.price.toLocaleString() + (inputs.taxMode ? ' ÷1.13' : '') + ' × ' + inputs.grade.toFixed(2) + '% × ' + coeff.toFixed(1) + '%' + (inputs.oreType === 'laterite' ? ' × (1-' + inputs.moisture + '%水分)' : '') + ' - TC ' + inputs.tc
    };
  };

  NickelCalc.prototype.renderResults = function(results, inputs) {
    var html = '<div class="result-main"><span class="rm-label">镍矿石单价</span><span class="rm-value">' + results.orePrice + '</span></div>' +
      '<div class="result-sub"><span>计价系数</span><span>' + results.coeff + '</span></div>' +
      '<div class="formula">' + results.formula + '</div>';
    this.el.querySelector('.result-area').innerHTML = html;
  };

  NickelCalc.prototype.saveDraft = function() {
    var vals = this.getInputs();
    var data = { locked: this.state.locked, inputs: vals, oreType: this.oreType };
    C.setStorage(this.id + '_draft', data);
    C.showToast(this.name + ' 草稿已保存');
  };

  NickelCalc.prototype.loadDraft = function() {
    var draft = C.getStorage(this.id + '_draft', null);
    if (!draft) return;
    if (draft.locked != null) this.state.locked = draft.locked;
    this.updateLockIcon();
    if (draft.oreType) {
      this.oreType = draft.oreType;
      var self = this;
      this.el.querySelectorAll('.segmented button').forEach(function(b) {
        b.classList.toggle('active', b.dataset.value === draft.oreType);
      });
    }
    if (draft.inputs) {
      var self = this;
      for (var k in draft.inputs) {
        if (k === 'taxMode') {
          var cb = self.el.querySelector('#nickel_taxMode');
          if (cb) cb.checked = draft.inputs[k] === 1;
        } else {
          var el = self.el.querySelector('#nickel_' + k);
          if (el) el.value = draft.inputs[k];
        }
      }
    }
  };

  window.NickelCalc = NickelCalc;
})(window);
