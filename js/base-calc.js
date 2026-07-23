// js/base-calc.js - 计价器基类
(function(window) {
  'use strict';

  var C = window.MCSCommon;

  function BaseCalc(config) {
    this.id = config.id;
    this.name = config.name;
    this.theme = config.theme || { primary: '#9b00ff', accent: '#00f0ff' };
    this.fields = config.fields || [];
    this.priceSource = config.priceSource || null;
    this.price = 0;
    this.manualPrice = false;
    this.state = { locked: false, folded: false };
    this.container = document.getElementById('cards-container');
    if (!this.container) throw new Error('缺少 #cards-container');
    this.init();
  }

  BaseCalc.prototype.calcTotal = function(inputs) {
    throw new Error('子类必须实现 calcTotal');
  };

  BaseCalc.prototype.fetchPrice = function() {
    var self = this;
    fetch('data/price.json?_=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!self.manualPrice && d.price > 0) {
          self.price = d.price;
          self.updatePriceDisplay();
          self.autoCalc();
        }
      })
      .catch(function() {
        self.updatePriceDisplay(true);
      });
  };

  BaseCalc.prototype.updatePriceDisplay = function(offline) {
    var el = this.el.querySelector('.price-value');
    if (!el) return;
    if (offline) {
      var defaultText = this.price ? C.fmt(this.price, 0) : '--';
      el.innerHTML = '<span class="offline">离线 · ' + defaultText + '</span><span class="unit">元/吨</span>';
    } else {
      el.innerHTML = C.fmt(this.price, 0) + '<span class="unit">元/吨</span>';
    }
  };

  BaseCalc.prototype.init = function() {
    this.renderCard();
    this.el = document.getElementById('card-' + this.id);
    this.bindInputs();
    this.loadDraft();
    this.fetchPrice();
    // 先不自动计算，等价格回来后再计算
  };

  BaseCalc.prototype.renderCard = function() {
    var self = this;
    var html = '<article class="calc-card card-' + this.id + '" id="card-' + this.id + '">' +
      '<header class="card-header">' +
        '<div class="card-title-wrap">' +
          '<span class="card-icon" style="background:' + this.theme.primary + '">' + (this.theme.icon || '◆') + '</span>' +
          '<div><h2>' + this.name + '</h2><span class="card-tag" style="color:' + this.theme.primary + '">' + (this.theme.tag || '') + '</span></div>' +
        '</div>' +
        '<div class="card-actions">' +
          '<button class="btn-lock" title="锁定全局参数">🔓</button>' +
          '<button class="btn-fold" title="折叠/展开">▼</button>' +
        '</div>' +
      '</header>' +
      '<div class="card-body">' +
        '<div class="price-bar">' +
          '<div class="price-label"><span class="dot"></span><span class="price-name">行情价格</span></div>' +
          '<div class="price-value">--</div>' +
          '<div class="price-meta">' +
            '<span class="price-time">加载中...</span>' +
            '<button class="btn-refresh">↻ 刷新</button>' +
          '</div>' +
        '</div>' +
        '<div class="inputs-area">' + this.renderInputs() + '</div>' +
        '<div class="result-area"></div>' +
        '<div class="card-ops">' +
          '<button class="btn-copy">📋 复制结果</button>' +
          '<button class="btn-reset">🔄 本条重置</button>' +
          '<button class="btn-save">💾 保存草稿</button>' +
        '</div>' +
      '</div>' +
    '</article>';

    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    this.container.appendChild(wrapper.firstElementChild);

    var card = document.getElementById('card-' + this.id);
    card.querySelector('.btn-lock').addEventListener('click', function() { self.toggleLock(); });
    card.querySelector('.btn-fold').addEventListener('click', function() { self.toggleFold(); });
    card.querySelector('.btn-refresh').addEventListener('click', function() { self.fetchPrice(); });
    card.querySelector('.btn-copy').addEventListener('click', function() { self.copyResult(); });
    card.querySelector('.btn-reset').addEventListener('click', function() { self.resetCard(); });
    card.querySelector('.btn-save').addEventListener('click', function() { self.saveDraft(); });
  };

  BaseCalc.prototype.renderInputs = function() {
    var self = this;
    return this.fields.map(function(f) {
      var id = self.id + '_' + f.id;
      return '<div class="field">' +
        '<label>' + f.label + (f.unit ? ' <span>' + f.unit + '</span>' : '') + '</label>' +
        '<div class="input-wrap">' +
          '<input type="number" id="' + id + '" data-field="' + f.id + '"' +
            (f.step ? ' step="' + f.step + '"' : '') +
            (f.min != null ? ' min="' + f.min + '"' : '') +
            (f.max != null ? ' max="' + f.max + '"' : '') +
            (f.default != null ? ' value="' + f.default + '"' : '') +
            ' placeholder="' + (f.placeholder || '') + '">' +
          (f.unit ? '<span class="suffix">' + f.unit + '</span>' : '') +
        '</div>' +
        '<div class="error-tip" style="display:none">数值范围: ' + (f.min != null ? f.min : '无下限') + ' ~ ' + (f.max != null ? f.max : '无上限') + '</div>' +
      '</div>';
    }).join('');
  };

  BaseCalc.prototype.bindInputs = function() {
    var self = this;
    var inputs = this.el.querySelectorAll('input[data-field]');
    inputs.forEach(function(input) {
      input.addEventListener('input', function() { self.autoCalc(); });
      input.addEventListener('blur', function() { self.saveDraft(); });
    });
  };

  BaseCalc.prototype.getInputs = function() {
    var vals = {};
    var self = this;
    this.fields.forEach(function(f) {
      var el = self.el.querySelector('#' + self.id + '_' + f.id);
      vals[f.id] = el ? parseFloat(el.value) : (f.default != null ? f.default : 0);
    });
    return vals;
  };

  BaseCalc.prototype.validate = function() {
    var self = this;
    var ok = true;
    this.fields.forEach(function(f) {
      var el = self.el.querySelector('#' + self.id + '_' + f.id);
      if (el && !C.validateRange(el, f.min, f.max)) ok = false;
    });
    return ok;
  };

  BaseCalc.prototype.autoCalc = function() {
    if (!this.validate()) {
      this.el.querySelector('.result-area').innerHTML = '<div class="result-error">请检查输入数值</div>';
      return;
    }
    var inputs = this.getInputs();
    var results = this.calcTotal(inputs);
    this.renderResults(results, inputs);
  };

  BaseCalc.prototype.renderResults = function(results, inputs) {
    var html = '<div class="result-list">';
    for (var key in results) {
      if (key === 'formula') continue;
      html += '<div class="result-item"><span class="r-label">' + key + '</span><span class="r-value">' + results[key] + '</span></div>';
    }
    html += '</div>';
    if (results.formula) {
      html += '<div class="formula">' + results.formula + '</div>';
    }
    this.el.querySelector('.result-area').innerHTML = html;
  };

  BaseCalc.prototype.saveDraft = function() {
    var vals = this.getInputs();
    var data = { locked: this.state.locked, inputs: vals };
    C.setStorage(this.id + '_draft', data);
    C.showToast(this.name + ' 草稿已保存');
  };

  BaseCalc.prototype.loadDraft = function() {
    var draft = C.getStorage(this.id + '_draft', null);
    if (!draft) return;
    if (draft.locked != null) this.state.locked = draft.locked;
    this.updateLockIcon();
    if (draft.inputs) {
      var self = this;
      for (var k in draft.inputs) {
        var el = self.el.querySelector('#' + self.id + '_' + k);
        if (el) el.value = draft.inputs[k];
      }
    }
  };

  BaseCalc.prototype.resetCard = function() {
    var self = this;
    this.fields.forEach(function(f) {
      var el = self.el.querySelector('#' + self.id + '_' + f.id);
      if (el) el.value = f.default != null ? f.default : '';
    });
    this.state.locked = false;
    this.updateLockIcon();
    this.autoCalc();
    C.showToast(this.name + ' 已重置');
  };

  BaseCalc.prototype.copyResult = function() {
    var el = this.el.querySelector('.result-area');
    if (!el) return;
    var text = el.textContent || el.innerText || '';
    var self = this;
    C.copyText(text, function(ok) {
      C.showToast(ok ? self.name + ' 结果已复制' : '复制失败');
    });
  };

  BaseCalc.prototype.toggleLock = function() {
    this.state.locked = !this.state.locked;
    this.updateLockIcon();
    this.saveDraft();
  };

  BaseCalc.prototype.updateLockIcon = function() {
    var btn = this.el.querySelector('.btn-lock');
    if (!btn) return;
    btn.textContent = this.state.locked ? '🔒' : '🔓';
    btn.title = this.state.locked ? '已锁定全局参数' : '锁定全局参数';
    this.el.classList.toggle('locked', this.state.locked);
  };

  BaseCalc.prototype.toggleFold = function() {
    this.state.folded = !this.state.folded;
    this.el.classList.toggle('folded', this.state.folded);
    var btn = this.el.querySelector('.btn-fold');
    if (btn) btn.textContent = this.state.folded ? '▶' : '▼';
  };

  BaseCalc.prototype.applyGlobalConfig = function(config) {
    if (this.state.locked) return;
  };

  window.BaseCalc = BaseCalc;
})(window);
