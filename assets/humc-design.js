/**
 * HUMC Gear design studio — place store marks on Front/Back/Left/Right.
 * Standard snap zones or free place. Lettering deferred.
 * Writes compact design JSON onto line-item properties.
 */
(function () {
  'use strict';

  var CANVAS_SIZE = 600;
  var ANGLES = ['Front', 'Right', 'Back', 'Left'];
  // Chest / sleeve spots calibrated from HUMC mockup photos (600×600).
  var ZONES = {
    Front: {
      'Left chest': { left: 0.56, top: 0.20, width: 0.13, height: 0.13 },
      'Center chest': { left: 0.38, top: 0.28, width: 0.24, height: 0.18 },
      'Full front': { left: 0.30, top: 0.26, width: 0.40, height: 0.32 }
    },
    Back: {
      'Upper back': { left: 0.38, top: 0.22, width: 0.24, height: 0.16 },
      'Center back': { left: 0.34, top: 0.34, width: 0.32, height: 0.24 }
    },
    Left: {
      'Left sleeve': { left: 0.54, top: 0.26, width: 0.16, height: 0.16 }
    },
    Right: {
      'Right sleeve': { left: 0.18, top: 0.26, width: 0.16, height: 0.16 }
    }
  };

  function studioRoots() {
    return document.querySelectorAll('[data-humc-design]');
  }

  function waitForFabric(done) {
    if (window.fabric) {
      done();
      return;
    }
    var n = 0;
    var timer = setInterval(function () {
      n += 1;
      if (window.fabric || n > 80) {
        clearInterval(timer);
        done();
      }
    }, 50);
  }

  function bindStudio(root) {
    if (!root || root.dataset.humcDesignBound === '1') return;
    root.dataset.humcDesignBound = '1';

    var assetBase = root.getAttribute('data-asset-base') || '';
    var familyId = root.getAttribute('data-family-id') || '18991186';
    var dialog = root.querySelector('[data-humc-design-dialog]');
    var canvasEl = root.querySelector('[data-humc-design-canvas]');
    var zoneBar = root.querySelector('[data-humc-design-zones]');
    var statusEl = root.querySelector('[data-humc-design-status]');
    var designInput = root.querySelector('input[name="properties[Design]"]');
    var logoInput = root.querySelector('input[name="properties[Logo]"]');
    var placeInput = root.querySelector('input[name="properties[Print locations]"]');
    var letterInput = root.querySelector('input[name="properties[Lettering]"]');
    var summary = root.querySelector('[data-summary]');
    var errorEl = root.querySelector('[data-error]');

    var marks = {
      'Standard HUMC': root.getAttribute('data-mark-standard') || '',
      'Single-color HUMC': root.getAttribute('data-mark-single') || '',
      'LA County': root.getAttribute('data-mark-la') || ''
    };

    var canvas = null;
    var currentAngle = 'Front';
    var currentColorId = root.getAttribute('data-color-id') || '';
    var currentColorName = root.getAttribute('data-color-name') || '';
    var sideData = { Front: [], Back: [], Left: [], Right: [] };
    var zoneGuides = [];
    var lastActive = null;

    function say(msg) {
      if (statusEl) statusEl.textContent = msg || '';
    }

    function showError(msg) {
      if (!errorEl) return;
      errorEl.hidden = !msg;
      errorEl.textContent = msg || '';
    }

    function angleToPlace(angle) {
      if (angle === 'Back') return 'Back';
      if (angle === 'Left') return 'Left sleeve';
      if (angle === 'Right') return 'Right sleeve';
      return 'Front';
    }

    function plainUrl(angle) {
      if (!currentColorId) return '';
      if (!angle || angle === 'Front') {
        return assetBase + 'humc-m-' + familyId + '-' + currentColorId + '-plain.jpg';
      }
      if (angle === 'Right') {
        return assetBase + 'humc-m-' + familyId + '-' + currentColorId + '-right-plain.jpg';
      }
      return assetBase + 'humc-m-' + familyId + '-' + currentColorId + '-' + angle.toLowerCase() + '.jpg';
    }

    function stockUrl(angle) {
      if (!currentColorId) return '';
      var suffix = !angle || angle === 'Front' ? '' : '-' + angle.toLowerCase();
      return assetBase + 'humc-m-' + familyId + '-' + currentColorId + suffix + '.jpg';
    }

    function loadBackground(angle, done) {
      if (!canvas || !window.fabric) return;
      var prefer = plainUrl(angle);
      var fallback = stockUrl(angle);

      function place(url, onFail) {
        if (!url) {
          if (onFail) onFail();
          else if (done) done(false);
          return;
        }
        window.fabric.Image.fromURL(
          url,
          function (img) {
            var el = img && img.getElement && img.getElement();
            if (!img || !el || !el.naturalWidth) {
              if (onFail) onFail();
              else if (done) done(false);
              return;
            }
            img.set({
              selectable: false,
              evented: false,
              originX: 'left',
              originY: 'top',
              left: 0,
              top: 0
            });
            var scale = Math.min(CANVAS_SIZE / (img.width || CANVAS_SIZE), CANVAS_SIZE / (img.height || CANVAS_SIZE));
            img.scale(scale);
            canvas.setBackgroundImage(img, function () {
              canvas.requestRenderAll();
              if (done) done(true);
            });
          },
          { crossOrigin: 'anonymous' }
        );
      }

      place(prefer || fallback, function () {
        if (fallback && prefer && fallback !== prefer) place(fallback);
        else if (done) done(false);
      });
    }

    function clearGuides() {
      zoneGuides.forEach(function (g) {
        canvas.remove(g);
      });
      zoneGuides = [];
    }

    function drawGuides() {
      clearGuides();
      if (!canvas) return;
      var map = ZONES[currentAngle] || {};
      Object.keys(map).forEach(function (name) {
        var z = map[name];
        var rect = new window.fabric.Rect({
          left: z.left * CANVAS_SIZE,
          top: z.top * CANVAS_SIZE,
          width: z.width * CANVAS_SIZE,
          height: z.height * CANVAS_SIZE,
          fill: 'rgba(9, 90, 166, 0.05)',
          stroke: 'rgba(9, 90, 166, 0.5)',
          strokeDashArray: [6, 4],
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
          humcGuide: true
        });
        canvas.add(rect);
        zoneGuides.push(rect);
      });
      canvas.requestRenderAll();
    }

    function designObjects() {
      if (!canvas) return [];
      return canvas.getObjects().filter(function (obj) {
        return !obj.humcGuide && obj !== canvas.backgroundImage;
      });
    }

    function rememberActive(obj) {
      if (obj && !obj.humcGuide) lastActive = obj;
    }

    function activeLogo() {
      var obj = (canvas && canvas.getActiveObject()) || lastActive;
      if (!obj || obj.humcGuide || !canvas) return null;
      if (designObjects().indexOf(obj) === -1) return null;
      return obj;
    }

    function saveSide() {
      sideData[currentAngle] = designObjects().map(function (obj) {
        return {
          type: 'logo',
          name: obj.humcName || '',
          left: obj.left || 0,
          top: obj.top || 0,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          angle: obj.angle || 0,
          originX: obj.originX || 'center',
          originY: obj.originY || 'center',
          src: obj.humcSrc || marks[obj.humcName] || ''
        };
      });
    }

    function restoreSide(angle) {
      designObjects().forEach(function (obj) {
        canvas.remove(obj);
      });
      clearGuides();
      lastActive = null;
      var items = sideData[angle] || [];
      var pending = items.length;
      if (!pending) {
        drawGuides();
        canvas.requestRenderAll();
        return;
      }
      items.forEach(function (item) {
        window.fabric.Image.fromURL(
          item.src || marks[item.name],
          function (img) {
            if (!img) {
              pending -= 1;
              if (!pending) {
                drawGuides();
                canvas.requestRenderAll();
              }
              return;
            }
            decorateLogo(img, item.name, item.src || marks[item.name]);
            img.set({
              left: item.left,
              top: item.top,
              scaleX: item.scaleX || 1,
              scaleY: item.scaleY || 1,
              angle: item.angle || 0,
              originX: item.originX || 'center',
              originY: item.originY || 'center'
            });
            canvas.add(img);
            pending -= 1;
            if (!pending) {
              drawGuides();
              canvas.requestRenderAll();
            }
          },
          { crossOrigin: 'anonymous' }
        );
      });
    }

    function setAngle(angle) {
      if (!canvas || !angle) return;
      saveSide();
      currentAngle = angle;
      root.querySelectorAll('[data-humc-design-view]').forEach(function (btn) {
        var on = btn.getAttribute('data-humc-design-view') === angle;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderZoneChips();
      loadBackground(angle, function () {
        restoreSide(angle);
        say(angle + ' view — drag to place, or snap to a standard spot.');
      });
    }

    function turn(delta) {
      var i = ANGLES.indexOf(currentAngle);
      if (i < 0) i = 0;
      var next = ANGLES[(i + delta + ANGLES.length) % ANGLES.length];
      setAngle(next);
    }

    function renderZoneChips() {
      if (!zoneBar) return;
      zoneBar.innerHTML = '';
      var map = ZONES[currentAngle] || {};
      Object.keys(map).forEach(function (name) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'humc-design__chip';
        btn.textContent = name;
        btn.setAttribute('data-humc-zone', name);
        btn.addEventListener('click', function () {
          snapToZone(name);
        });
        zoneBar.appendChild(btn);
      });
      var free = document.createElement('button');
      free.type = 'button';
      free.className = 'humc-design__chip';
      free.textContent = 'Free place';
      free.addEventListener('click', function () {
        say('Free place: drag and resize on this side. Keep logos small for a clean print.');
      });
      zoneBar.appendChild(free);
    }

    function clampLogoScale(obj) {
      if (!obj) return;
      var maxEdge = 0.18 * CANVAS_SIZE;
      var w = Math.max(obj.width || 1, 1) * Math.abs(obj.scaleX || 1);
      var h = Math.max(obj.height || 1, 1) * Math.abs(obj.scaleY || 1);
      var edge = Math.max(w, h);
      if (edge > maxEdge) {
        var f = maxEdge / edge;
        obj.set({
          scaleX: (obj.scaleX || 1) * f,
          scaleY: (obj.scaleY || 1) * f
        });
      }
    }

    function snapToZone(name) {
      var z = (ZONES[currentAngle] || {})[name];
      if (!z || !canvas) return;
      var obj = activeLogo();
      if (!obj) {
        say('Select a logo first, then tap a standard spot.');
        return;
      }
      canvas.setActiveObject(obj);
      var boxW = z.width * CANVAS_SIZE;
      var boxH = z.height * CANVAS_SIZE;
      var scale = Math.min(boxW / Math.max(obj.width || 1, 1), boxH / Math.max(obj.height || 1, 1));
      obj.set({
        originX: 'center',
        originY: 'center',
        left: (z.left + z.width / 2) * CANVAS_SIZE,
        top: (z.top + z.height / 2) * CANVAS_SIZE,
        scaleX: scale,
        scaleY: scale,
        angle: 0
      });
      clampLogoScale(obj);
      obj.setCoords();
      canvas.requestRenderAll();
      say('Snapped to ' + name + '.');
    }

    function decorateLogo(img, name, src) {
      img.set({
        originX: 'center',
        originY: 'center',
        humcKind: 'logo',
        humcName: name,
        humcSrc: src,
        lockUniScaling: true,
        centeredScaling: true,
        objectCaching: false
      });
    }

    function addMark(name) {
      var src = marks[name];
      if (!src || !canvas) {
        say('That mark is not available.');
        return;
      }
      window.fabric.Image.fromURL(
        src,
        function (img) {
          if (!img) return;
          // Default ~ left-chest print size; stay sharp (no giant upscales).
          var target = 0.11 * CANVAS_SIZE;
          var scale = target / Math.max(img.width || 1, img.height || 1);
          decorateLogo(img, name, src);
          img.set({
            left: CANVAS_SIZE * 0.62,
            top: CANVAS_SIZE * 0.26,
            scaleX: scale,
            scaleY: scale
          });
          clampLogoScale(img);
          canvas.add(img).setActiveObject(img);
          rememberActive(img);
          canvas.requestRenderAll();
          say(name + ' added. Snap to a standard spot or drag freely.');
        },
        { crossOrigin: 'anonymous' }
      );
    }

    function removeSelected() {
      var obj = activeLogo();
      if (!obj) {
        say('Select a logo to remove.');
        return;
      }
      canvas.remove(obj);
      if (lastActive === obj) lastActive = null;
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      say('Logo removed.');
    }

    function clearSide() {
      designObjects().forEach(function (obj) {
        canvas.remove(obj);
      });
      lastActive = null;
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      say('This side cleared.');
    }

    function compactDesign() {
      saveSide();
      var out = { v: 1, color: currentColorName, colorId: currentColorId, sides: {} };
      ANGLES.forEach(function (angle) {
        var items = sideData[angle] || [];
        if (!items.length) return;
        out.sides[angle] = items.map(function (item) {
          return {
            type: 'logo',
            name: item.name,
            left: Math.round(item.left),
            top: Math.round(item.top),
            scaleX: Math.round((item.scaleX || 1) * 1000) / 1000,
            scaleY: Math.round((item.scaleY || 1) * 1000) / 1000,
            angle: Math.round(item.angle || 0)
          };
        });
      });
      return out;
    }

    function renderPreviewForAngle(angle, done) {
      if (!canvas) {
        if (done) done('');
        return;
      }
      var prev = currentAngle;
      saveSide();
      currentAngle = angle;
      loadBackground(angle, function () {
        restoreSide(angle);
        window.setTimeout(function () {
          clearGuides();
          var dataUrl = '';
          try {
            dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1.5 });
          } catch (err) {
            dataUrl = '';
          }
          drawGuides();
          currentAngle = prev;
          loadBackground(prev, function () {
            restoreSide(prev);
            if (done) done(dataUrl);
          });
        }, 120);
      });
    }

    function applyToForm() {
      var design = compactDesign();
      var sides = Object.keys(design.sides);
      var logos = [];
      sides.forEach(function (angle) {
        (design.sides[angle] || []).forEach(function (item) {
          if (item.name && logos.indexOf(item.name) === -1) logos.push(item.name);
        });
      });

      if (designInput) designInput.value = JSON.stringify(design);
      if (logoInput) logoInput.value = logos.length ? logos.join(', ') : 'No logo';
      if (placeInput) {
        placeInput.value = sides
          .map(function (angle) {
            return angleToPlace(angle);
          })
          .join(', ');
      }
      if (letterInput) letterInput.value = '';

      var bits = [];
      if (currentColorName) bits.push(currentColorName);
      if (logoInput && logoInput.value) bits.push(logoInput.value);
      if (placeInput && placeInput.value) bits.push(placeInput.value);
      if (summary) summary.textContent = bits.join(' · ');

      clearGuides();
      var dataUrl = '';
      try {
        dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1.5 });
      } catch (err) {
        dataUrl = '';
      }
      drawGuides();
      if (dataUrl) {
        var photo = document.querySelector('[data-humc-demo-photo]');
        if (photo) photo.setAttribute('src', dataUrl);
        document.querySelectorAll('.product-media__image').forEach(function (shopImg) {
          shopImg.setAttribute('src', dataUrl);
          shopImg.removeAttribute('srcset');
        });
      }
      var caption = document.querySelector('[data-humc-demo-caption]');
      if (caption) {
        caption.textContent = bits.concat([currentAngle]).filter(Boolean).join(' · ');
      }
      buildProductTurn(design, bits);
      showError('');
      say('Design saved on this product.');
    }

    function buildProductTurn(design, bits) {
      var host = document.querySelector('[data-humc-demo]') || document.querySelector('[data-humc-stage]');
      if (!host) return;
      var bar = document.querySelector('[data-humc-view-turn]');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'humc-demo__turn';
        bar.setAttribute('data-humc-view-turn', '');
        var stage = document.querySelector('[data-humc-stage]') || host;
        stage.parentNode.insertBefore(bar, stage.nextSibling);
      }
      bar.innerHTML = '';
      var sides = Object.keys((design && design.sides) || {});
      var list = sides.length ? sides : ['Front'];
      list.forEach(function (angle) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'humc-customize__chip' + (angle === currentAngle ? ' is-on' : '');
        btn.textContent = angle;
        btn.addEventListener('click', function () {
          bar.querySelectorAll('button').forEach(function (b) {
            b.classList.toggle('is-on', b === btn);
          });
          // Quick stock/plain preview without reopening studio when possible
          var url = plainUrl(angle) || stockUrl(angle);
          if (url) {
            var photo = document.querySelector('[data-humc-demo-photo]');
            if (photo) photo.setAttribute('src', url);
            document.querySelectorAll('.product-media__image').forEach(function (shopImg) {
              shopImg.setAttribute('src', url);
              shopImg.removeAttribute('srcset');
            });
          }
          if (!canvas) return;
          renderPreviewForAngle(angle, function (dataUrl) {
            if (!dataUrl) return;
            var photo = document.querySelector('[data-humc-demo-photo]');
            if (photo) photo.setAttribute('src', dataUrl);
            document.querySelectorAll('.product-media__image').forEach(function (shopImg) {
              shopImg.setAttribute('src', dataUrl);
              shopImg.removeAttribute('srcset');
            });
            var caption = document.querySelector('[data-humc-demo-caption]');
            if (caption) caption.textContent = (bits || []).concat([angle]).filter(Boolean).join(' · ');
          });
        });
        bar.appendChild(btn);
      });
    }

    function fitCanvasDisplay() {
      if (!canvas || !canvasEl) return;
      var wrap = root.querySelector('.humc-design__stage-wrap');
      var avail = wrap ? Math.max(220, wrap.clientWidth - 8) : CANVAS_SIZE;
      var css = Math.min(CANVAS_SIZE, avail);
      canvas.setDimensions({ width: css, height: css }, { cssOnly: true });
      canvas.calcOffset();
      canvas.requestRenderAll();
    }

    function openStudio() {
      if (!dialog) return;
      currentColorId = root.getAttribute('data-color-id') || currentColorId;
      currentColorName = root.getAttribute('data-color-name') || currentColorName;
      dialog.removeAttribute('inert');
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      document.documentElement.style.overflow = 'hidden';
      if (!canvas) {
        waitForFabric(function () {
          if (!window.fabric) {
            say('Design editor failed to load. Refresh the page.');
            return;
          }
          canvas = new window.fabric.Canvas(canvasEl, {
            preserveObjectStacking: true,
            selection: true,
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            backgroundColor: '#e8e8e8',
            enableRetinaScaling: true,
            uniScaleKey: null
          });
          canvas.on('selection:created', function (e) {
            rememberActive(e && e.selected && e.selected[0]);
          });
          canvas.on('selection:updated', function (e) {
            rememberActive(e && e.selected && e.selected[0]);
          });
          canvas.on('object:scaling', function (e) {
            clampLogoScale(e && e.target);
          });
          canvas.on('object:modified', function (e) {
            clampLogoScale(e && e.target);
            canvas.requestRenderAll();
          });
          fitCanvasDisplay();
          setAngle(currentAngle);
          window.setTimeout(fitCanvasDisplay, 50);
        });
      } else {
        fitCanvasDisplay();
        setAngle(currentAngle);
      }
    }

    function closeStudio() {
      if (!dialog) return;
      if (typeof dialog.close === 'function') dialog.close();
      dialog.removeAttribute('open');
      dialog.setAttribute('inert', '');
      document.documentElement.style.overflow = '';
    }

    function setColor(name, colorId) {
      currentColorName = name || '';
      currentColorId = colorId || '';
      root.setAttribute('data-color-id', currentColorId);
      root.setAttribute('data-color-name', currentColorName);
      if (dialog && (dialog.open || dialog.hasAttribute('open')) && canvas) {
        loadBackground(currentAngle, function () {
          drawGuides();
        });
      }
    }

    root.querySelectorAll('[data-humc-design-open]').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        openStudio();
      });
    });
    root.querySelectorAll('[data-humc-design-close]').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        closeStudio();
      });
    });
    root.querySelectorAll('[data-humc-design-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setAngle(btn.getAttribute('data-humc-design-view'));
      });
    });
    root.querySelectorAll('[data-humc-design-turn]').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        turn(Number(btn.getAttribute('data-humc-design-turn')) || 1);
      });
    });
    root.querySelectorAll('[data-humc-design-mark]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addMark(btn.getAttribute('data-humc-design-mark'));
      });
    });
    var applyBtn = root.querySelector('[data-humc-design-apply]');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        applyToForm();
        closeStudio();
      });
    }
    var delBtn = root.querySelector('[data-humc-design-delete]');
    if (delBtn) {
      // Keep canvas selection when pressing the button (mousedown would clear it).
      delBtn.addEventListener('mousedown', function (event) {
        event.preventDefault();
      });
      delBtn.addEventListener('click', function (event) {
        event.preventDefault();
        removeSelected();
      });
    }
    var clearBtn = root.querySelector('[data-humc-design-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('mousedown', function (event) {
        event.preventDefault();
      });
      clearBtn.addEventListener('click', function (event) {
        event.preventDefault();
        clearSide();
      });
    }

    document.addEventListener('keydown', function (event) {
      if (!dialog || !(dialog.open || dialog.hasAttribute('open'))) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        var tag = (event.target && event.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        event.preventDefault();
        removeSelected();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        turn(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        turn(1);
      }
    });

    if (dialog) {
      dialog.addEventListener('close', function () {
        dialog.setAttribute('inert', '');
        document.documentElement.style.overflow = '';
      });
    }

    root._humcDesignApi = {
      open: openStudio,
      close: closeStudio,
      setColor: setColor,
      apply: applyToForm,
      hasArt: function () {
        saveSide();
        return ANGLES.some(function (a) {
          return (sideData[a] || []).length;
        });
      }
    };
  }

  function boot() {
    studioRoots().forEach(bindStudio);
  }

  boot();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('shopify:section:load', boot);
  [200, 800, 1600].forEach(function (ms) {
    window.setTimeout(boot, ms);
  });

  window.humcDesignSetColor = function (name, colorId) {
    studioRoots().forEach(function (root) {
      if (root._humcDesignApi) root._humcDesignApi.setColor(name, colorId);
    });
  };
})();
