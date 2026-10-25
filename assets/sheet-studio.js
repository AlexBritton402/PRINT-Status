(() => {
  const ROOTS = document.querySelectorAll('[data-sheet-studio]');
  if (!ROOTS.length) return;

  const MAX_BYTES = 18 * 1024 * 1024;

  function fileKind(file) {
    const name = String((file && file.name) || '').toLowerCase();
    const type = String((file && file.type) || '').toLowerCase();
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type === 'image/png' || name.endsWith('.png')) return 'png';
    if (type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpg';
    return 'other';
  }

  function parseSize(raw) {
    const m = String(raw || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
    if (!m) return { w: 22, h: 24, label: String(raw || '22x24') };
    return { w: Number(m[1]), h: Number(m[2]), label: `${m[1]}x${m[2]}` };
  }

  function variantIdFromPage(root) {
    const formId = root.dataset.formId;
    const form = (formId && document.getElementById(formId)) || document.querySelector('form[data-type="add-to-cart-form"]');
    const input = form && form.querySelector('input[name="id"]');
    return input && input.value ? String(input.value) : root.dataset.initialVariant || '';
  }

  function pageForm(root) {
    const formId = root.dataset.formId;
    return (formId && document.getElementById(formId)) || document.querySelector('form[data-type="add-to-cart-form"]');
  }

  function normalizeId(id) {
    return String(id || '').split('/').pop();
  }

  function findVariant(variants, id) {
    const want = normalizeId(id);
    return variants.find((v) => normalizeId(v.id) === want) || variants[0] || null;
  }

  function matchVariant(variants, size, turnaround) {
    return variants.find((v) => v.size === size && v.turnaround === turnaround)
      || variants.find((v) => v.size === size)
      || variants[0]
      || null;
  }

  function waitForFabric(done) {
    if (window.fabric) {
      done();
      return;
    }
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      if (window.fabric || n > 80) {
        clearInterval(t);
        done();
      }
    }, 50);
  }

  function dataUrlToFile(dataUrl, name) {
    const parts = dataUrl.split(',');
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
    const bin = atob(parts[1] || '');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name, { type: mime });
  }

  function tickMarks(host, count, axis) {
    if (!host) return;
    host.textContent = '';
    const step = count > 36 ? 6 : count > 24 ? 4 : 2;
    for (let i = 0; i <= count; i += 1) {
      if (i !== 0 && i !== count && i % step !== 0) continue;
      const tick = document.createElement('span');
      tick.className = 'sheet-studio__tick';
      tick.textContent = String(i);
      const pct = `${(i / Math.max(count, 1)) * 100}%`;
      if (axis === 'x') tick.style.left = pct;
      else tick.style.top = pct;
      host.appendChild(tick);
    }
  }

  ROOTS.forEach((root) => {
    let variants = [];
    try {
      variants = JSON.parse(root.dataset.variants || '[]');
    } catch (err) {
      variants = [];
    }

    const dialog = root.querySelector('[data-sheet-dialog]');
    const canvasEl = root.querySelector('[data-sheet-canvas]');
    const statusEl = root.querySelector('[data-sheet-status]');
    const priceEl = root.querySelector('[data-sheet-price]');
    const drop = root.querySelector('[data-sheet-drop]');
    const fileInput = root.querySelector('[data-sheet-file]');
    const titleEl = root.querySelector('[data-sheet-title]');
    const createBtn = root.querySelector('[data-sheet-open="create"]');
    const addBtn = root.querySelector('[data-sheet-add]');
    const checkoutBtn = root.querySelector('[data-sheet-checkout]');
    const gapInput = root.querySelector('[data-sheet-gap]');
    const say = (msg) => {
      if (statusEl) statusEl.textContent = msg;
    };

    let canvas = null;
    let originalFile = null;
    let finishedSheet = false;
    let pieceNames = [];
    let busy = false;
    const jobKind = root.dataset.job === 'Upload' ? 'Upload' : 'Create';

    function currentVariant() {
      return findVariant(variants, variantIdFromPage(root));
    }

    function markChips() {
      const variant = currentVariant();
      root.querySelectorAll('[data-sheet-size]').forEach((btn) => {
        btn.classList.toggle('is-on', Boolean(variant && btn.dataset.sheetSize === variant.size));
      });
      root.querySelectorAll('[data-sheet-turn]').forEach((btn) => {
        btn.classList.toggle('is-on', Boolean(variant && btn.dataset.sheetTurn === variant.turnaround));
      });
      if (priceEl) {
        const size = parseSize(variant && variant.size);
        const rush = variant && /rush/i.test(variant.turnaround || '') ? 'Rush' : 'Normal';
        priceEl.textContent = variant && variant.price
          ? `${size.label} · ${rush} · ${variant.price}`
          : '';
      }
    }

    function syncPageVariant(variant) {
      if (!variant) return;
      const form = pageForm(root);
      const input = form && form.querySelector('input[name="id"]');
      const id = normalizeId(variant.id);
      if (input && String(input.value) !== id) {
        input.value = id;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.querySelectorAll('input[type="radio"]').forEach((radio) => {
        if (radio.value === variant.size || radio.value === variant.turnaround) {
          if (!radio.checked) radio.click();
        }
      });
    }

    function applySheetSize() {
      if (!canvas) return;
      const variant = currentVariant();
      const size = parseSize(variant && variant.size);
      const stage = root.querySelector('[data-sheet-stage]');
      const maxW = Math.max(220, (stage && stage.clientWidth) || 360);
      const maxH = Math.min(Math.round(window.innerHeight * 0.62), 720);
      const ratio = size.h / size.w;
      let w = maxW;
      let h = Math.round(w * ratio);
      if (h > maxH) {
        h = maxH;
        w = Math.max(180, Math.round(h / ratio));
      }
      const prevW = canvas.getWidth();
      canvas.setWidth(w);
      canvas.setHeight(h);
      if (prevW && prevW !== w) {
        const scale = w / prevW;
        canvas.getObjects().forEach((obj) => {
          obj.scaleX *= scale;
          obj.scaleY *= scale;
          obj.left *= scale;
          obj.top *= scale;
          obj.setCoords();
        });
      }
      canvas.renderAll();
      tickMarks(root.querySelector('[data-ruler-x]'), size.w, 'x');
      tickMarks(root.querySelector('[data-ruler-y]'), size.h, 'y');
      if (titleEl) titleEl.textContent = 'Gang Sheet';
      markChips();
    }

    function openStudio() {
      if (dialog) dialog.removeAttribute('inert');
      if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
      else if (dialog) dialog.setAttribute('open', '');
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        applySheetSize();
        say('Drop a PNG or JPG. We place it and pack the sheet. Size and rush update the price.');
      });
    }

    function closeStudio() {
      if (dialog && dialog.open) dialog.close();
      if (dialog) dialog.setAttribute('inert', '');
      document.documentElement.style.overflow = '';
    }

    function dpiFor(img, size) {
      const inches = (img.getScaledWidth() / canvas.getWidth()) * size.w;
      return Math.round(img.width / Math.max(inches, 0.1));
    }

    function qualityLabel(dpi) {
      if (dpi >= 300) return 'print-ready';
      if (dpi >= 250) return 'acceptable';
      return 'too soft for print';
    }

    function looksLikeFinishedSheet(img, size) {
      if (!img || !img.width) return false;
      const ratio = img.width / Math.max(img.height, 1);
      const sheet = size.w / Math.max(size.h, 1);
      const close = Math.abs(ratio - sheet) < 0.18;
      return close && img.width >= 1200;
    }

    function addImageFromFile(file) {
      if (!file) return;
      if (file.size > MAX_BYTES) {
        say('That file is over 18 MB. Save a smaller PNG or JPG.');
        return;
      }
      const kind = fileKind(file);
      if (kind === 'pdf') {
        originalFile = file;
        finishedSheet = true;
        pieceNames = [file.name];
        canvas.getObjects().slice().forEach((obj) => canvas.remove(obj));
        canvas.renderAll();
        say(`${file.name} is a PDF. It goes to the order as the finished sheet.`);
        return;
      }
      if (kind === 'other') {
        say('Use a PNG or JPG. Transparent PNG at 300 dpi prints cleanest.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        window.fabric.Image.fromURL(ev.target.result, (img) => {
          const variant = currentVariant();
          const size = parseSize(variant && variant.size);
          const fitSheet = looksLikeFinishedSheet(img, size);
          if (fitSheet) {
            canvas.getObjects().slice().forEach((obj) => canvas.remove(obj));
            originalFile = file;
            finishedSheet = true;
            pieceNames = [file.name];
          } else {
            if (finishedSheet) pieceNames = [];
            finishedSheet = false;
            originalFile = null;
            pieceNames.push(file.name);
          }
          const targetIn = fitSheet ? size.w - 0.5 : Math.min(8, size.w * 0.42);
          const targetPx = (targetIn / size.w) * canvas.getWidth();
          const scale = Math.min(targetPx / img.width, (canvas.getHeight() * (fitSheet ? 0.94 : 0.7)) / img.height);
          img.set({
            left: canvas.getWidth() / 2,
            top: canvas.getHeight() / 2,
            originX: 'center',
            originY: 'center',
          });
          img.scale(scale);
          canvas.add(img).setActiveObject(img);
          canvas.renderAll();
          const dpi = dpiFor(img, size);
          if (fitSheet) {
            say(`${file.name} filled the sheet · about ${dpi} DPI (${qualityLabel(dpi)}).`);
          } else {
            arrange();
            say(`${file.name} · about ${dpi} DPI (${qualityLabel(dpi)}). Packed on the sheet.`);
          }
        }, { crossOrigin: 'anonymous' });
      };
      reader.readAsDataURL(file);
    }

    function exportLayout() {
      const variant = currentVariant();
      const size = parseSize(variant && variant.size);
      const longest = Math.max(size.w, size.h);
      const target = Math.min(4096, Math.round(longest * 200));
      const multiplier = Math.max(1, Math.min(8, target / canvas.getWidth()));
      try {
        return canvas.toDataURL({ format: 'png', multiplier });
      } catch (err) {
        return canvas.toDataURL({ format: 'png', multiplier: 2 });
      }
    }

    function setBusy(on) {
      busy = on;
      if (addBtn) addBtn.disabled = on;
      if (checkoutBtn) checkoutBtn.disabled = on;
    }

    async function addToCart(goCheckout) {
      const variant = currentVariant();
      if (!variant || !variant.id) {
        say('Pick a size and turnaround.');
        return;
      }
      if (!variant.available) {
        say('That size is not available.');
        return;
      }
      const hasArt = canvas.getObjects().length > 0 || originalFile;
      if (!hasArt) {
        say('Add a PNG or JPG first.');
        return;
      }
      setBusy(true);
      say(goCheckout ? 'Adding the sheet, then opening checkout…' : 'Adding the sheet to your cart…');
      try {
        const size = parseSize(variant.size);
        const fd = new FormData();
        fd.append('id', normalizeId(variant.id));
        fd.append('quantity', '1');
        fd.append('properties[Job]', jobKind);
        fd.append('properties[Layout]', finishedSheet ? 'Finished sheet' : 'Packed logos');
        fd.append('properties[Sheet]', `${size.label} in`);
        if (variant.turnaround) fd.append('properties[Turnaround]', variant.turnaround);
        if (pieceNames.length) fd.append('properties[Files]', pieceNames.join(', '));
        if (finishedSheet && originalFile) {
          fd.append('properties[Artwork]', originalFile, originalFile.name);
        } else {
          const dataUrl = exportLayout();
          const preview = dataUrlToFile(dataUrl, `print-status-${size.label}.png`);
          fd.append('properties[Artwork]', preview, preview.name);
        }
        const res = await fetch('/cart/add.js', { method: 'POST', body: fd });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.status) {
          throw new Error(body.description || body.message || `cart ${res.status}`);
        }
        say(goCheckout ? 'Opening checkout…' : 'Added. Opening the cart…');
        window.location.href = goCheckout ? '/checkout' : '/cart';
      } catch (err) {
        setBusy(false);
        say(err && err.message ? String(err.message) : 'Could not add to cart. Try a smaller file.');
      }
    }

    function arrange() {
      if (finishedSheet && canvas.getObjects().length <= 1) {
        say('This file is the full sheet. Add more logos if you want them packed.');
        return;
      }
      const objs = canvas.getObjects();
      if (!objs.length) {
        say('Add artwork first.');
        return;
      }
      const variant = currentVariant();
      const size = parseSize(variant && variant.size);
      const gapIn = Math.max(0, Number(gapInput && gapInput.value) || 0.12);
      const gap = canvas.getWidth() * (gapIn / size.w);
      const margin = canvas.getWidth() * (0.3 / size.w);
      let x = margin;
      let y = margin;
      let rowH = 0;
      objs.forEach((obj) => {
        const w = obj.getScaledWidth();
        const h = obj.getScaledHeight();
        if (x + w > canvas.getWidth() - margin && x > margin) {
          x = margin;
          y += rowH + gap;
          rowH = 0;
        }
        obj.set({ left: x + w / 2, top: y + h / 2, originX: 'center', originY: 'center' });
        obj.setCoords();
        x += w + gap;
        rowH = Math.max(rowH, h);
      });
      canvas.renderAll();
      say(y + rowH > canvas.getHeight() - margin
        ? 'Some designs hang off the sheet. Pick a longer size or scale them down.'
        : `Packed on the sheet with a ${gapIn} in gap.`);
    }

    waitForFabric(() => {
      if (!window.fabric) {
        say('The sheet editor failed to load. Refresh the page.');
        return;
      }
      canvas = new window.fabric.Canvas(canvasEl, {
        backgroundColor: 'rgba(255,255,255,0)',
        preserveObjectStacking: true,
        selection: true,
      });
      applySheetSize();
      if (pendingFiles.length) {
        pendingFiles.splice(0).forEach(addImageFromFile);
      }
    });

    if (createBtn) createBtn.addEventListener('click', () => openStudio());
    root.querySelectorAll('[data-sheet-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeStudio());
    });
    if (dialog) {
      dialog.addEventListener('close', () => {
        dialog.setAttribute('inert', '');
        document.documentElement.style.overflow = '';
      });
    }

    function pickOption(size, turnaround) {
      const next = matchVariant(variants, size, turnaround);
      syncPageVariant(next);
      applySheetSize();
      if (canvas && canvas.getObjects().length && !finishedSheet) arrange();
      if (next && next.price) {
        const rush = /rush/i.test(next.turnaround || '') ? 'Rush' : 'Normal';
        say(`${parseSize(next.size).label} · ${rush} · ${next.price}`);
      }
    }

    root.querySelectorAll('[data-sheet-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const variant = currentVariant();
        pickOption(btn.dataset.sheetSize, variant && variant.turnaround);
      });
    });
    root.querySelectorAll('[data-sheet-turn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const variant = currentVariant();
        pickOption(variant && variant.size, btn.dataset.sheetTurn);
      });
    });

    const pendingFiles = [];

    function ingestFiles(files) {
      const list = Array.from(files || []);
      if (!list.length) return;
      if (!dialog || !dialog.open) openStudio();
      if (!canvas) {
        pendingFiles.push(...list);
        return;
      }
      list.forEach(addImageFromFile);
    }

    if (fileInput) {
      fileInput.addEventListener('change', (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        ingestFiles(files);
      });
    }
    if (drop) {
      ['dragenter', 'dragover'].forEach((name) => {
        drop.addEventListener(name, (event) => {
          event.preventDefault();
          drop.classList.add('is-over');
        });
      });
      ['dragleave', 'drop'].forEach((name) => {
        drop.addEventListener(name, (event) => {
          event.preventDefault();
          drop.classList.remove('is-over');
        });
      });
      drop.addEventListener('drop', (event) => {
        Array.from(event.dataTransfer.files || []).forEach(addImageFromFile);
      });
      drop.addEventListener('click', () => fileInput && fileInput.click());
      drop.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (fileInput) fileInput.click();
        }
      });
    }

    const addTextBtn = root.querySelector('[data-sheet-add-text]');
    const textInput = root.querySelector('[data-sheet-text]');
    if (addTextBtn) {
      addTextBtn.addEventListener('click', () => {
        const val = ((textInput && textInput.value) || '').trim();
        if (!val) {
          say('Type the text first.');
          return;
        }
        const t = new window.fabric.IText(val, {
          left: canvas.getWidth() / 2,
          top: canvas.getHeight() / 2,
          originX: 'center',
          originY: 'center',
          fontFamily: window.getComputedStyle(root).fontFamily || 'Georgia, serif',
          fill: '#111111',
          fontSize: Math.round(canvas.getWidth() / 12),
        });
        canvas.add(t).setActiveObject(t);
        canvas.renderAll();
        finishedSheet = false;
        originalFile = null;
        pieceNames.push(`text:${val}`);
        if (textInput) textInput.value = '';
        say('Text added. Drag to place it.');
      });
    }

    const action = (name, fn) => {
      const btn = root.querySelector(`[data-sheet-${name}]`);
      if (btn) btn.addEventListener('click', fn);
    };
    action('pack', arrange);
    action('duplicate', () => {
      const obj = canvas.getActiveObject();
      if (!obj) {
        say('Select a design first.');
        return;
      }
      obj.clone((clone) => {
        clone.set({ left: (obj.left || 0) + 16, top: (obj.top || 0) + 16 });
        canvas.add(clone).setActiveObject(clone);
        canvas.renderAll();
      });
    });
    action('delete', () => {
      const obj = canvas.getActiveObject();
      if (!obj) {
        say('Select a design first.');
        return;
      }
      canvas.remove(obj);
      canvas.renderAll();
    });
    action('clear', () => {
      canvas.getObjects().slice().forEach((obj) => canvas.remove(obj));
      canvas.renderAll();
      originalFile = null;
      finishedSheet = false;
      pieceNames = [];
      say('Sheet cleared.');
    });
    if (addBtn) addBtn.addEventListener('click', () => addToCart(false));
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => addToCart(true));

    document.addEventListener('variant:update', () => {
      applySheetSize();
    });
    window.addEventListener('resize', () => {
      if (dialog && dialog.open) applySheetSize();
    });
  });
})();
