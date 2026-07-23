// js/calc-znpb.js
(function(window) {
  'use strict';

  var C = window.MCSCommon;
  var BaseCalc = window.BaseCalc;

  var ZN_COEFF = [[25,60],[35,65],[45,70],[50,75],[55,75],[60,75]];
  var PB_COEFF = [[30,55],[35,60],[40,65],[50,75],[60,80],[70,88],[80,88]];

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

  function ZnpbCalc() {
    BaseCalc.call(this, {
      id: 'znpb',
      name: '铅锌矿',
      theme: { primary: '#ffc107', accent: '#4ecdc4', icon: '🟡', tag: 'Zn / Pb · SMM' },
      fields: []
    });
    this.znPrice = 24420;
    this.pbPrice = 16260;
  }

  ZnpbCalc.prototype = Object.create(BaseCalc.prototype);
  ZnpbCalc.prototype.constructor = ZnpbCalc;

  ZnpbCalc.prototype.fetchPrice = function() {
    var self = this;
    fetch('https://api.fsxsymall.com/api/znpb-price?_=' + Date.now(), { signal: AbortSignal.timeout(5000) })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.zn && d.zn.price) self.znPrice = d.zn.price;
        if (d.pb && d.pb.price) self.pbPrice = d.pb.price;
        self.updatePriceDisplay();
        self.autoCalc();
      })
      .catch(function() {
        fetch('data/price.json?_=' + Date.now())
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (d.zn && d.zn.price) self.znPrice = d.zn.price;
            if (d.pb && d.pb.price) self.pbPrice = d.pb.price;
            self.updatePriceDisplay(true);
            self.autoCalc();
          })
          .catch(function() {
            self.updatePriceDisplay(true);
            self.autoCalc();
          });
      });
  };

  ZnpbCalc.prototype.updatePriceDisplay = function(offline) {
    var label = this.el.querySelector('.price-name');
    if (label) label.textContent = 'SMM 1#锌锭 / 1#铅锭';
    var el = this.el.querySelector('.price-value');
    if (el) {
      if (offline) {
        el.innerHTML = '<span class="offline">Zn ' + C.fmt(this.znPrice, 0) + ' / Pb ' + C.fmt(this.pbPrice, 0) + '</span><span class="unit">元/吨</span>';
      } else {
        el.innerHTML = 'Zn ' + C.fmt(this.znPrice, 0) + ' / Pb ' + C.fmt(this.pbPrice, 0) + '<span class="unit">元/吨</span>';
      }
    }
    var meta = this.el.querySelector('.price-time');
    if (meta) meta.textContent = offline ? '离线 · 默认参考价' : '实时行情';
  };

  ZnpbCalc.prototype.renderInputs = function() {
    return '<div class="field">' +
      '<label>计价模式</label>' +
      '<div class="segmented triple" data-field="mode">' +
        '<button data-value="zn" class="active">🪙 纯锌矿</button>' +
        '<button data-value="pb">🪨 纯铅矿</button>' +
        '<button data-value="mixed">⚒️ 铅锌混合矿</button>' +
      '</div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div class="field"><label>锌品位 Zn <span>%</span></label><div class="input-wrap"><input type="number" id="znpb_znGrade" data-field="znGrade" value="50" min="25" max="60" step="0.1"><span class="suffix">%</span></div></div>' +
      '<div class="field"><label>铅品位 Pb <span>%</span></label><div class="input-wrap"><input type="number" id="znpb_pbGrade" data-field="pbGrade" value="60" min="30" max="80" step="0.1"><span class="suffix">%</span></div></div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div class="field"><label>锌 TC <span>元/金属吨</span></label><div class="input-wrap"><input type="number" id="znpb_tcZn" data-field="tcZn" value="5200" min="4000" max="7000" step="100"><span class="suffix">元/金属吨</span></div></div>' +
      '<div class="field"><label>铅 TC <span>元/金属吨</span></label><div class="input-wrap"><input type="number" id="znpb_tcPb" data-field="tcPb" value="500" min="300" max="800" step="50"><span class="suffix">元/金属吨</span></div></div>' +
    '</div>' +
    '<div class="field switch-field"><label>含税价 → 不含税 (÷1.13)</label><label class="switch"><input type="checkbox" id="znpb_taxMode" checked><span class="slider"></span></label></div>';
  };

  ZnpbCalc.prototype.bindInputs = function() {
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
        self.autoCalc();
        self.saveDraft();
      }
    });
  };

  ZnpbCalc.prototype.getInputs = function() {
    var modeBtn = this.el.querySelector('.segmented button.active');
    return {
      mode: modeBtn ? modeBtn.dataset.value : 'zn',
      znGrade: parseFloat(this.el.querySelector('#znpb_znGrade').value) || 50,
      pbGrade: parseFloat(this.el.querySelector('#znpb_pbGrade').value) || 60,
      tcZn: parseFloat(this.el.querySelector('#znpb_tcZn').value) || 5200,
      tcPb: parseFloat(this.el.querySelector('#znpb_tcPb').value) || 500,
      taxMode: this.el.querySelector('#znpb_taxMode').checked ? 1 : 0
    };
  };

  ZnpbCalc.prototype.calcTotal = function(inputs) {
    var divider = inputs.taxMode ? 1.13 : 1;
    var znCoeff = getCoeff(ZN_COEFF, inputs.znGrade);
    var pbCoeff = getCoeff(PB_COEFF, inputs.pbGrade);
    var znOre = ((this.znPrice / divider) - inputs.tcZn) * (znCoeff / 100) * (inputs.znGrade / 100);
    var pbOre = ((this.pbPrice / divider) - inputs.tcPb) * (pbCoeff / 100) * (inputs.pbGrade / 100);
    var total = 0, formula = '';
    if (inputs.mode === 'zn') {
      total = znOre;
      formula = '1#锌 ' + this.znPrice.toLocaleString() + (inputs.taxMode ? ' ÷1.13' : '') + ' × ' + znCoeff.toFixed(1) + '% × ' + inputs.znGrade.toFixed(1) + '% - TC ' + inputs.tcZn;
    } else if (inputs.mode === 'pb') {
      total = pbOre;
      formula = '1#铅 ' + this.pbPrice.toLocaleString() + (inputs.taxMode ? ' ÷1.13' : '') + ' × ' + pbCoeff.toFixed(1) + '% × ' + inputs.pbGrade.toFixed(1) + '% - TC ' + inputs.tcPb;
    } else {
      total = znOre + pbOre;
      formula = '锌部分: ' + C.fmt(znOre, 0) + ' + 铅部分: ' + C.fmt(pbOre, 0);
    }
    return {
      znCoeff: C.formatPercent(znCoeff),
      pbCoeff: C.formatPercent(pbCoeff),
      orePrice: '¥' + C.fmt(total, 0) + ' /吨',
      formula: formula
    };
  };

  ZnpbCalc.prototype.renderResults = function(results, inputs) {
    var html = '<div class="result-main"><span class="rm-label">精矿单价</span><span class="rm-value">' + results.orePrice + '</span></div>' +
      '<div class="result-sub"><span>锌系数</span><span>' + results.znCoeff + '</span></div>' +
      '<div class="result-sub"><span>铅系数</span><span>' + results.pbCoeff + '</span></div>' +
      '<div class="formula">' + results.formula + '</div>';
    this.el.querySelector('.result-area').innerHTML = html;
  };

  ZnpbCalc.prototype.saveDraft = function() {
    var vals = this.getInputs();
    var data = { locked: this.state.locked, inputs: vals };
    C.setStorage(this.id + '_draft', data);
    C.showToast(this.name + ' 草稿已保存');
  };

  ZnpbCalc.prototype.loadDraft = function() {
    var draft = C.getStorage(this.id + '_draft', null);
    if (!draft) return;
    if (draft.locked != null) this.state.locked = draft.locked;
    this.updateLockIcon();
    if (draft.inputs) {
      var self = this;
      for (var k in draft.inputs) {
        if (k === 'taxMode') {
          var cb = self.el.querySelector('#znpb_taxMode');
          if (cb) cb.checked = draft.inputs[k] === 1;
        } else {
          var el = self.el.querySelector('#znpb_' + k);
          if (el) el.value = draft.inputs[k];
        }
      }
    }
  };

  window.ZnpbCalc = ZnpbCalc;
})(window);
