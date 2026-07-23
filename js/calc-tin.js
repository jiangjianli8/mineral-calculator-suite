// js/calc-tin.js
(function(window) {
  'use strict';

  var C = window.MCSCommon;
  var BaseCalc = window.BaseCalc;

  function getTC(grade) {
    if (grade >= 60) return 13500;
    if (grade >= 55) return 13700;
    if (grade >= 50) return 14000;
    if (grade >= 45) return 15000;
    if (grade >= 40) return 17500;
    if (grade >= 20) return Math.round(22000 + (17500 - 22000) * (grade - 20) / 20);
    if (grade >= 10) return Math.round(27000 + (22000 - 27000) * (grade - 10) / 10);
    return 27000;
  }

  function TinCalc() {
    BaseCalc.call(this, {
      id: 'tin',
      name: '锡矿石',
      theme: { primary: '#b0bec5', accent: '#80deea', icon: '⬜', tag: 'Sn · 沪锡 / LME' },
      fields: []
    });
    this.price = 412550;
  }

  TinCalc.prototype = Object.create(BaseCalc.prototype);
  TinCalc.prototype.constructor = TinCalc;

  TinCalc.prototype.updatePriceDisplay = function(offline) {
    var el = this.el.querySelector('.price-value');
    if (!el) return;
    var label = this.el.querySelector('.price-name');
    if (label) label.textContent = 'SMM 1#电解锡';
    if (offline) {
      el.innerHTML = '<span class="offline">离线 · ' + C.fmt(this.price, 0) + '</span><span class="unit">元/吨</span>';
    } else {
      el.innerHTML = C.fmt(this.price, 0) + '<span class="unit">元/吨</span>';
    }
  };

  TinCalc.prototype.renderInputs = function() {
    return '<div class="field">' +
      '<label>计价模式</label>' +
      '<div class="segmented" data-field="mode">' +
        '<button data-value="domestic" class="active">🇨🇳 国内计价</button>' +
        '<button data-value="import">🌍 进口计价</button>' +
      '</div>' +
    '</div>' +
    '<div class="field"><label>锡品位 Sn <span>%</span></label><div class="input-wrap"><input type="number" id="tin_grade" data-field="grade" value="40" min="10" max="65" step="0.1"><span class="suffix">%</span></div></div>' +
    '<div class="import-fields" id="tin_importFields" style="display:none">' +
      '<div class="field"><label>LME锡价 <span>美元/吨</span></label><div class="input-wrap"><input type="number" id="tin_lmePrice" data-field="lmePrice" value="53500" step="100"><span class="suffix">美元/吨</span></div></div>' +
      '<div class="two-col">' +
        '<div class="field"><label>汇率</label><div class="input-wrap"><input type="number" id="tin_fxRate" data-field="fxRate" value="7.25" min="6.5" max="8.0" step="0.01"></div></div>' +
        '<div class="field"><label>进口杂费 <span>元/吨</span></label><div class="input-wrap"><input type="number" id="tin_importFee" data-field="importFee" value="500" step="10"><span class="suffix">元/吨</span></div></div>' +
      '</div>' +
    '</div>';
  };

  TinCalc.prototype.bindInputs = function() {
    var self = this;
    var allInputs = this.el.querySelectorAll('input');
    allInputs.forEach(function(el) {
      el.addEventListener('input', function() { self.autoCalc(); });
      el.addEventListener('blur', function() { self.saveDraft(); });
    });
    this.el.querySelector('.segmented').addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON') {
        self.el.querySelectorAll('.segmented button').forEach(function(b) { b.classList.remove('active'); });
        e.target.classList.add('active');
        var mode = e.target.dataset.value;
        self.el.querySelector('#tin_importFields').style.display = mode === 'import' ? 'block' : 'none';
        self.autoCalc();
        self.saveDraft();
      }
    });
  };

  TinCalc.prototype.getInputs = function() {
    var modeBtn = this.el.querySelector('.segmented button.active');
    return {
      mode: modeBtn ? modeBtn.dataset.value : 'domestic',
      grade: parseFloat(this.el.querySelector('#tin_grade').value) || 40,
      lmePrice: parseFloat(this.el.querySelector('#tin_lmePrice').value) || 53500,
      fxRate: parseFloat(this.el.querySelector('#tin_fxRate').value) || 7.25,
      importFee: parseFloat(this.el.querySelector('#tin_importFee').value) || 500
    };
  };

  TinCalc.prototype.calcTotal = function(inputs) {
    var price = inputs.mode === 'import' ? inputs.lmePrice * inputs.fxRate + inputs.importFee : this.price;
    var tc = getTC(inputs.grade);
    var metalTonPrice = price - tc;
    var orePrice = metalTonPrice * (inputs.grade / 100);
    var coeff = (metalTonPrice / price) * 100;
    return {
      tc: C.fmt(tc, 0) + ' 元/金属吨',
      coeff: C.formatPercent(coeff),
      metalTonPrice: '¥' + C.fmt(metalTonPrice, 0) + ' /金属吨',
      orePrice: '¥' + C.fmt(orePrice, 0) + ' /吨',
      formula: '(' + C.fmt(price, 0) + ' - ' + C.fmt(tc, 0) + ') × ' + inputs.grade.toFixed(1) + '% = ' + C.fmt(orePrice, 0) + ' 元/吨  [' + (inputs.mode === 'import' ? 'LME×汇率+杂费' : '沪锡结算价') + ']'
    };
  };

  TinCalc.prototype.renderResults = function(results, inputs) {
    var html = '<div class="result-main"><span class="rm-label">锡矿石单价</span><span class="rm-value">' + results.orePrice + '</span></div>' +
      '<div class="result-sub"><span>净回值</span><span>' + results.metalTonPrice + '</span></div>' +
      '<div class="result-sub"><span>加工费 TC</span><span>' + results.tc + '</span></div>' +
      '<div class="result-sub"><span>计价系数</span><span>' + results.coeff + '</span></div>' +
      '<div class="formula">' + results.formula + '</div>';
    this.el.querySelector('.result-area').innerHTML = html;
  };

  TinCalc.prototype.saveDraft = function() {
    var vals = this.getInputs();
    var data = { locked: this.state.locked, inputs: vals };
    C.setStorage(this.id + '_draft', data);
    C.showToast(this.name + ' 草稿已保存');
  };

  TinCalc.prototype.loadDraft = function() {
    var draft = C.getStorage(this.id + '_draft', null);
    if (!draft) return;
    if (draft.locked != null) this.state.locked = draft.locked;
    this.updateLockIcon();
    if (draft.inputs) {
      var self = this;
      for (var k in draft.inputs) {
        var el = self.el.querySelector('#tin_' + k);
        if (el) el.value = draft.inputs[k];
      }
    }
  };

  window.TinCalc = TinCalc;
})(window);
