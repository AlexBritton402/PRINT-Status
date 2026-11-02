/**
 * HUMC Gear design studio — Tapstitch-style Fabric.js editor.
 * Official store marks + custom lettering. Preset zones or free place.
 * Writes compact design JSON onto line-item properties.
 */
(function () {
  'use strict';

  var CANVAS_SIZE = 600;

  var ZONES = {
    Front: {
      'Left chest': { left: 0.56, top: 0.26, width: 0.12, height: 0.12 },
      'Center chest': { left: 0.35, top: 0.30, width: 0.30, height: 0.22 },
      'Full front': { left: 0.28, top: 0.28, width: 0.44, height: 0.36 }
    },
    Back: {
      'Upper back': { left: 0.35, top: 0.24, width: 0.30, height: 0.18 },
      'Center back': { left: 0.32, top: 0.32, width: 0.36, height: 0.28 }
    },
    Left: {
      'Left sleeve': { left: 0.56, top: 0.30, width: 0.14, height: 0.14 }
    },
    Right: {
      'Right sleeve': { left: 0.30, top: 0.30, width: 0.14, height: 0.14 }
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

    var formId = root.getAttribute('data-form-id');
    var assetBase = root.getAttribute('data-asset-base') || '';
    var familyId = root.getAttribute('data-family-id') || '18991186';
    var dialog = root.querySelector('[data-humc-design-dialog]');
    var canvasEl = root.querySelector('[data-humc-design-canvas]');
    var zoneBar = root.querySelector('[data-humc-design-zones]');
    var statusEl = root.querySelector('[data-humc-design-status]');
    var textInput = root.querySelector('[data-humc-design-text]');
    var textColor = root.querySelector('[data-humc-design-text-color]');
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
        // crossOrigin required so Apply can export toDataURL without tainting
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
          fill: 'rgba(9, 90, 166, 0.06)',
          stroke: 'rgba(9, 90, 166, 0.55)',
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

    function saveSide() {
      sideData[currentAngle] = designObjects().map(function (obj) {
        var base = {
          type: obj.humcKind || (obj.type === 'i-text' || obj.type === 'textbox' ? 'text' : 'logo'),
          name: obj.humcName || '',
          text: obj.text || '',
          fill: obj.fill || '',
          left: obj.left || 0,
          top: obj.top || 0,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          angle: obj.angle || 0,
          fontSize: obj.fontSize || 28,
          originX: obj.originX || 'left',
          originY: obj.originY || 'top'
        };
        if (base.type === 'logo') base.src = obj.humcSrc || marks[obj.humcName] || '';
        return base;
      });
    }

    function restoreSide(angle) {
      designObjects().forEach(function (obj) {
        canvas.remove(obj);
      });
      clearGuides();
      var items = sideData[angle] || [];
      var pending = items.length;
      if (!pending) {
        drawGuides();
        canvas.requestRenderAll();
        return;
      }
      items.forEach(function (item) {
        if (item.type === 'text') {
          var t = new window.fabric.IText(item.text || 'Text', {
            left: item.left,
            top: item.top,
            scaleX: item.scaleX || 1,
            scaleY: item.scaleY || 1,
            angle: item.angle || 0,
            fill: item.fill || '#ffffff',
            fontSize: item.fontSize || 28,
            fontFamily: 'Montserrat, Karla, sans-serif',
            originX: item.originX || 'left',
            originY: item.originY || 'top',
            humcKind: 'text',
            humcName: 'Lettering'
          });
          canvas.add(t);
          pending -= 1;
          if (!pending) {
            drawGuides();
            canvas.requestRenderAll();
          }
        } else {
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
              img.set({
                left: item.left,
                top: item.top,
                scaleX: item.scaleX || 1,
                scaleY: item.scaleY || 1,
                angle: item.angle || 0,
                originX: item.originX || 'left',
                originY: item.originY || 'top',
                humcKind: 'logo',
                humcName: item.name,
                humcSrc: item.src || marks[item.name]
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
        }
      });
    }

    function setAngle(angle) {
      if (!canvas) return;
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
        say(angle + ' view. Drag to place. Use a standard spot or move freely.');
      });
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
        say('Free place: drag and resize anywhere on this side.');
      });
      zoneBar.appendChild(free);
    }

    function snapToZone(name) {
      var z = (ZONES[currentAngle] || {})[name];
      if (!z || !canvas) return;
      var obj = canvas.getActiveObject();
      if (!obj || obj.humcGuide) {
        say('Select a logo or text first, then tap a standard spot.');
        return;
      }
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
      obj.setCoords();
      canvas.requestRenderAll();
      say('Snapped to ' + name + '.');
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
          var target = 0.1 * CANVAS_SIZE;
          var scale = target / Math.max(img.width || 1, img.height || 1);
          img.set({
            left: CANVAS_SIZE * 0.62,
            top: CANVAS_SIZE * 0.30,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            humcKind: 'logo',
            humcName: name,
            humcSrc: src
          });
          canvas.add(img).setActiveObject(img);
          canvas.requestRenderAll();
          say(name + ' added. Snap to a standard spot or drag freely.');
        },
        { crossOrigin: 'anonymous' }
      );
    }

    function addLettering() {
      if (!canvas) return;
      var val = ((textInput && textInput.value) || '').trim();
      if (!val) {
        say('Type the lettering first.');
        return;
      }
      var fill = (textColor && textColor.value) || '#ffffff';
      var t = new window.fabric.IText(val, {
        left: CANVAS_SIZE / 2,
        top: CANVAS_SIZE * 0.34,
        originX: 'center',
        originY: 'center',
        fill: fill,
        fontSize: 32,
        fontFamily: 'Montserrat, Karla, sans-serif',
        fontWeight: '600',
        humcKind: 'text',
        humcName: 'Lettering'
      });
      canvas.add(t).setActiveObject(t);
      canvas.requestRenderAll();
      if (textInput) textInput.value = '';
      say('Lettering added. Drag to place or snap to a zone.');
    }

    function compactDesign() {
      saveSide();
      var out = { v: 1, color: currentColorName, colorId: currentColorId, sides: {} };
      ['Front', 'Back', 'Left', 'Right'].forEach(function (angle) {
        var items = sideData[angle] || [];
        if (!items.length) return;
        out.sides[angle] = items.map(function (item) {
          return {
            type: item.type,
            name: item.name,
            text: item.text,
            fill: item.fill,
            left: Math.round(item.left),
            top: Math.round(item.top),
            scaleX: Math.round((item.scaleX || 1) * 1000) / 1000,
            scaleY: Math.round((item.scaleY || 1) * 1000) / 1000,
            angle: Math.round(item.angle || 0),
            fontSize: item.fontSize || undefined
          };
        });
      });
      return out;
    }

    function applyToForm() {
      var design = compactDesign();
      var sides = Object.keys(design.sides);
      var logos = [];
      var letters = [];
      sides.forEach(function (angle) {
        (design.sides[angle] || []).forEach(function (item) {
          if (item.type === 'logo' && item.name && logos.indexOf(item.name) === -1) logos.push(item.name);
          if (item.type === 'text' && item.text) letters.push(item.text);
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
      if (letterInput) letterInput.value = letters.join(' · ');

      var bits = [];
      if (currentColorName) bits.push(currentColorName);
      if (logoInput && logoInput.value) bits.push(logoInput.value);
      if (letterInput && letterInput.value) bits.push('“' + letterInput.value + '”');
      if (placeInput && placeInput.value) bits.push(placeInput.value);
      if (summary) summary.textContent = bits.join(' · ');

      // Live product preview from current canvas (without guides)
      clearGuides();
      var dataUrl = '';
      try {
        dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
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
      showError('');
      say('Design saved on this product.');
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
            backgroundColor: '#e8e8e8'
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

    // Controls
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
    root.querySelectorAll('[data-humc-design-mark]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addMark(btn.getAttribute('data-humc-design-mark'));
      });
    });
    var addTextBtn = root.querySelector('[data-humc-design-add-text]');
    if (addTextBtn) addTextBtn.addEventListener('click', addLettering);
    var applyBtn = root.querySelector('[data-humc-design-apply]');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        applyToForm();
        closeStudio();
      });
    }
    var delBtn = root.querySelector('[data-humc-design-delete]');
    if (delBtn) {
      delBtn.addEventListener('click', function () {
        var obj = canvas && canvas.getActiveObject();
        if (!obj || obj.humcGuide) {
          say('Select a logo or text to remove.');
          return;
        }
        canvas.remove(obj);
        canvas.requestRenderAll();
      });
    }
    var clearBtn = root.querySelector('[data-humc-design-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        designObjects().forEach(function (obj) {
          canvas.remove(obj);
        });
        canvas.requestRenderAll();
        say('This side cleared.');
      });
    }

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
        return ['Front', 'Back', 'Left', 'Right'].some(function (a) {
          return (sideData[a] || []).length;
        });
      }
    };

    // Sync color from customize swatches
    document.addEventListener(
      'click',
      function (event) {
        var swatch = event.target && event.target.closest && event.target.closest('[data-field="color"]');
        if (!swatch || !root.contains(swatch.closest('[data-humc-customize]') || swatch)) return;
        // color handled by customize; also listen via custom event below
      },
      true
    );
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

  // Public helper for customize color changes
  window.humcDesignSetColor = function (name, colorId) {
    studioRoots().forEach(function (root) {
      if (root._humcDesignApi) root._humcDesignApi.setColor(name, colorId);
    });
  };
})();
