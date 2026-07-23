// js/common.js - 矿链通综合计价工具公共工具库
(function(window) {
  'use strict';

  var PREFIX = 'mcs_';

  function fmt(n, d) {
    if (n == null || isNaN(n)) return '--';
    return n.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function formatMoney(n) {
    return fmt(n, 2);
  }

  function formatPercent(n) {
    return fmt(n, 2) + '%';
  }

  function debounce(fn, wait) {
    var t;
    return function() {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function() { fn.apply(ctx, args); }, wait);
    };
  }

  function getStorage(key, fallback) {
    try {
      var v = localStorage.getItem(PREFIX + key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setStorage(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) {}
  }

  function removeStorage(key) {
    try { localStorage.removeItem(PREFIX + key); } catch (e) {}
  }

  function clearAllStorage() {
    try {
      Object.keys(localStorage).forEach(function(k) {
        if (k.indexOf(PREFIX) === 0) localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  function copyText(text, cb) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() { cb && cb(true); }, function() { cb && cb(false); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); cb && cb(true); } catch (e) { cb && cb(false); }
      document.body.removeChild(ta);
    }
  }

  function validateRange(input, min, max) {
    var v = parseFloat(input.value);
    var err = input.parentElement.querySelector('.error-tip') || (input.closest('.field') ? input.closest('.field').querySelector('.error-tip') : null);
    if (isNaN(v) || (min != null && v < min) || (max != null && v > max)) {
      input.classList.add('error');
      if (err) err.style.display = 'block';
      return false;
    }
    input.classList.remove('error');
    if (err) err.style.display = 'none';
    return true;
  }

  function showToast(msg, duration) {
    duration = duration || 1500;
    var el = document.getElementById('mcs-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mcs-toast';
      el.className = 'mcs-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.classList.remove('show'); }, duration);
  }

  window.MCSCommon = {
    fmt: fmt,
    formatMoney: formatMoney,
    formatPercent: formatPercent,
    debounce: debounce,
    getStorage: getStorage,
    setStorage: setStorage,
    removeStorage: removeStorage,
    clearAllStorage: clearAllStorage,
    copyText: copyText,
    validateRange: validateRange,
    showToast: showToast,
    PREFIX: PREFIX
  };
})(window);
