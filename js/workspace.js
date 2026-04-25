// WORKSPACE — fullscreen
// ══════════════════════════════════════════

// ── Fullscreen ────────────────────────────

function ensureFullscreenBtns() {
  // Phase 3+: flashcard panel no longer gets a fullscreen button — closing the
  // info panel returns the flashcard to its full-width default automatically,
  // so the manual toggle is redundant.
  const panels = [
    { id: 'info', el: document.getElementById('info-panel') },
  ];
  panels.forEach(({ id, el }) => {
    if (!el || el.querySelector('.ws-fullscreen-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'icon-btn ws-fullscreen-btn';
    btn.tabIndex = -1;
    btn.setAttribute('data-tip', 'fullscreen');
    btn.dataset.panelId = id;
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
        stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    btn.onclick = e => { e.stopPropagation(); wsToggleFullscreen(id); };
    el.appendChild(btn);
  });
}

function wsToggleFullscreen(panelId) {
  const workspace = document.getElementById('workspace');
  const panelEls = {
    flashcard: document.getElementById('main-content'),
    info:      document.getElementById('info-panel'),
  };
  const target = panelEls[panelId];
  if (!target) return;

  const isNowFullscreen = target.classList.toggle('ws-fullscreen');

  // Remove fullscreen from every other panel
  Object.entries(panelEls).forEach(([id, el]) => {
    if (id !== panelId && el) el.classList.remove('ws-fullscreen');
  });

  // Save / restore inline styles set by divider or edge resize
  const allPanels = Object.values(panelEls).filter(Boolean);
  if (isNowFullscreen) {
    allPanels.forEach(el => {
      el._savedStyle = { width: el.style.width, height: el.style.height, flex: el.style.flex };
      el.style.width = ''; el.style.height = ''; el.style.flex = '';
    });
  } else {
    allPanels.forEach(el => {
      if (el._savedStyle) {
        el.style.width = el._savedStyle.width;
        el.style.height = el._savedStyle.height;
        el.style.flex = el._savedStyle.flex;
        delete el._savedStyle;
      }
    });
  }

  // Hide/show other panels and dividers when entering/exiting fullscreen
  Object.entries(panelEls).forEach(([id, el]) => {
    if (id !== panelId && el) {
      el.style.display = isNowFullscreen ? 'none' : '';
    }
  });
  if (workspace) {
    workspace.querySelectorAll('.ws-divider').forEach(d => {
      d.style.display = isNowFullscreen ? 'none' : '';
    });
  }

  // Update button icon: expand ↔ compress
  const compressPath = `<path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const expandPath = `<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;

  target.querySelectorAll('.ws-fullscreen-btn svg').forEach(svg => {
    svg.innerHTML = isNowFullscreen ? compressPath : expandPath;
  });
  Object.entries(panelEls).forEach(([id, el]) => {
    if (id === panelId || !el) return;
    el.querySelectorAll('.ws-fullscreen-btn svg').forEach(svg => {
      svg.innerHTML = expandPath;
    });
  });
}

// Escape exits fullscreen — also restores hidden panels/dividers
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const fs = document.querySelector('.ws-fullscreen');
    if (fs) {
      e.stopImmediatePropagation(); // Prevent events.js handler from also firing
      const expandPath = `<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
          stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      fs.classList.remove('ws-fullscreen');
      fs.querySelectorAll('.ws-fullscreen-btn svg').forEach(svg => {
        svg.innerHTML = expandPath;
      });
      // Restore hidden panels, dividers, and saved inline styles
      const workspace = document.getElementById('workspace');
      const panelEls = {
        flashcard: document.getElementById('main-content'),
        info:      document.getElementById('info-panel'),
      };
      Object.entries(panelEls).forEach(([id, el]) => {
        if (!el) return;
        el.style.display = '';
        if (el._savedStyle) {
          el.style.width = el._savedStyle.width;
          el.style.height = el._savedStyle.height;
          el.style.flex = el._savedStyle.flex;
          delete el._savedStyle;
        }
      });
      if (workspace) {
        workspace.querySelectorAll('.ws-divider').forEach(d => d.style.display = '');
      }
    }
  }
});

function initWorkspace() {
  // Clear any stale zoom transform
  const pane = document.querySelector('.split-pane');
  if (pane) {
    pane.style.transform = '';
    pane.style.transformOrigin = '';
    pane.style.width = '';
    pane.style.height = '';
  }
  try { localStorage.removeItem('hanzi-ws-zoom'); } catch(e) {}
  _initTiling();
}

// ── Tiling system ─────────────────────────
function _initTiling() {
  const workspace = document.getElementById('workspace');
  if (!workspace) return;
  const LONG_PRESS_MS = 250;

  // Panel order state — visible panel IDs in display order.
  // Layout is locked to `row` (Phase 3): top/bottom drops are rejected and the
  // column switch in onDragEnd is gone. The variable stays so any defensive
  // code paths read a sensible value, but it's never reassigned.
  let panelOrder = ['flashcard'];
  const layoutDirection = 'row';

  function getPanelEl(id) {
    return workspace.querySelector(`[data-panel-id="${id}"]`);
  }

  function getVisiblePanels() {
    return Array.from(workspace.querySelectorAll('.ws-panel')).filter(el => {
      if (el.dataset.panelId === 'flashcard') return true;
      return el.classList.contains('open');
    });
  }

  // ── Rebuild DOM order + insert dividers ──
  function rebuildLayout() {
    workspace.querySelectorAll('.ws-divider').forEach(d => d.remove());

    const visibleIds = panelOrder.filter(id => {
      const el = getPanelEl(id);
      if (!el) return false;
      if (id === 'flashcard') return true;
      return el.classList.contains('open');
    });

    // Add visible panels not yet in panelOrder
    getVisiblePanels().map(el => el.dataset.panelId).forEach(id => {
      if (!visibleIds.includes(id)) visibleIds.push(id);
    });

    const frag = document.createDocumentFragment();
    visibleIds.forEach((id, i) => {
      const el = getPanelEl(id);
      if (!el) return;
      frag.appendChild(el);
      if (i < visibleIds.length - 1) {
        const div = document.createElement('div');
        div.className = `ws-divider visible ${layoutDirection === 'row' ? 'horizontal' : 'vertical'}`;
        div.dataset.leftPanel = id;
        div.dataset.rightPanel = visibleIds[i + 1];
        frag.appendChild(div);
      }
    });

    // Keep non-visible panels in DOM but hidden
    workspace.querySelectorAll('.ws-panel').forEach(el => {
      if (!visibleIds.includes(el.dataset.panelId)) frag.appendChild(el);
    });

    workspace.appendChild(frag);
    workspace.style.flexDirection = layoutDirection;
    panelOrder = visibleIds;
  }

  // ── Divider drag to resize ──
  let divDragging = false, divStartPos = 0, divLeftEl = null, divRightEl = null;
  let divLeftStart = 0, divRightStart = 0;

  workspace.addEventListener('mousedown', function(e) {
    const divider = e.target.closest('.ws-divider');
    if (!divider) return;
    e.preventDefault();
    divDragging = true;
    divider.classList.add('active');
    divLeftEl = getPanelEl(divider.dataset.leftPanel);
    divRightEl = getPanelEl(divider.dataset.rightPanel);

    const isRow = layoutDirection === 'row';
    divStartPos = isRow ? e.clientX : e.clientY;
    divLeftStart = isRow ? divLeftEl.offsetWidth : divLeftEl.offsetHeight;
    divRightStart = isRow ? divRightEl.offsetWidth : divRightEl.offsetHeight;

    const SNAP_DIST = 12;
    const MIN_PANEL = 260; /* Locked to ~current info-panel width — narrower breaks layout. */
    const onMove = (ev) => {
      if (!divDragging) return;
      const wsRect = workspace.getBoundingClientRect();
      const snapTargets = isRow
        ? [wsRect.left, wsRect.right, wsRect.left + wsRect.width / 2]
        : [wsRect.top, wsRect.bottom, wsRect.top + wsRect.height / 2];
      workspace.querySelectorAll('.ws-panel').forEach(p => {
        if (p === divLeftEl || p === divRightEl || p.offsetWidth === 0) return;
        const r = p.getBoundingClientRect();
        if (isRow) { snapTargets.push(r.left, r.right); }
        else { snapTargets.push(r.top, r.bottom); }
      });

      let mousePos = isRow ? ev.clientX : ev.clientY;
      for (const t of snapTargets) {
        if (Math.abs(mousePos - t) < SNAP_DIST) { mousePos = t; break; }
      }

      // Phase 3 fix: clamp the delta itself (not just the resulting widths).
      // Previously delta could grow past the legal range while the widths were
      // clamped at MIN_PANEL — dragging back required moving the cursor through
      // that "dead band" before the panels responded again. With delta clamped,
      // the panels react to cursor input immediately on any reverse motion.
      const minDelta = MIN_PANEL - divLeftStart;          // newLeft hits MIN
      const maxDelta = divRightStart - MIN_PANEL;          // newRight hits MIN
      let delta = mousePos - divStartPos;
      if (delta < minDelta) delta = minDelta;
      if (delta > maxDelta) delta = maxDelta;
      const newLeft = divLeftStart + delta;
      const newRight = divRightStart - delta;
      if (isRow) {
        divLeftEl.style.width = newLeft + 'px'; divLeftEl.style.flex = 'none';
        divRightEl.style.width = newRight + 'px'; divRightEl.style.flex = 'none';
      } else {
        divLeftEl.style.height = newLeft + 'px'; divLeftEl.style.flex = 'none';
        divRightEl.style.height = newRight + 'px'; divRightEl.style.flex = 'none';
      }
    };
    const onUp = () => {
      divDragging = false;
      divider.classList.remove('active');
      // Save info panel width if it was resized
      const infoPanel = document.getElementById('info-panel');
      if (infoPanel && (divLeftEl === infoPanel || divRightEl === infoPanel)) {
        try { setProfileData('hanzi-info-width', infoPanel.offsetWidth + ''); } catch(e) {}
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // ── Long-press drag to reorder panels ──
  let longPressTimer = null, dragSource = null, isDragging = false;
  let dragOriginX = 0, dragOriginY = 0, dragStartX = 0, dragStartY = 0;
  let dropIndicator = null;

  function createDropIndicator() {
    if (!dropIndicator) {
      dropIndicator = document.createElement('div');
      dropIndicator.className = 'ws-drop-indicator';
      dropIndicator.style.display = 'none';
      workspace.appendChild(dropIndicator);
    }
    return dropIndicator;
  }

  function startLongPress(el, e) {
    dragStartX = e.clientX; dragStartY = e.clientY;
    dragOriginX = e.clientX; dragOriginY = e.clientY;
    longPressTimer = setTimeout(() => {
      isDragging = true;
      dragSource = el;
      el.classList.add('panel-grab-ready', 'drag-source');
      workspace.classList.add('workspace-dragging');
      createDropIndicator();
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
    }, LONG_PRESS_MS);
    document.addEventListener('mousemove', onPreDragMove);
    document.addEventListener('mouseup', cancelLongPress);
  }

  function onPreDragMove(e) {
    if (Math.abs(e.clientX - dragStartX) > 10 || Math.abs(e.clientY - dragStartY) > 10) {
      cancelLongPress();
    }
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer); longPressTimer = null;
    document.removeEventListener('mousemove', onPreDragMove);
    document.removeEventListener('mouseup', cancelLongPress);
  }

  function onDragMove(e) {
    if (!isDragging || !dragSource) return;
    const dx = e.clientX - dragOriginX;
    const dy = e.clientY - dragOriginY;
    dragSource.style.transform = `translate(${dx}px, ${dy}px)`;
    dragSource.style.transition = 'none';

    const indicator = createDropIndicator();
    const panels = getVisiblePanels().filter(p => p !== dragSource);
    let bestTarget = null, bestSide = null, bestDist = Infinity;

    panels.forEach(panel => {
      const rect = panel.getBoundingClientRect();
      // Phase 3: layout is locked to row, so only left/right are valid drop
      // targets. Top/bottom hover used to switch to a column layout — that
      // path is gone, and surfacing a top/bottom indicator the user can't act
      // on is misleading.
      const sides = [
        { side: 'left',  dist: Math.abs(e.clientX - rect.left),  x: rect.left,      y: rect.top, w: 4, h: rect.height },
        { side: 'right', dist: Math.abs(e.clientX - rect.right), x: rect.right - 4, y: rect.top, w: 4, h: rect.height },
      ];
      sides.forEach(s => {
        const inX = e.clientX >= rect.left - 40 && e.clientX <= rect.right + 40;
        const inY = e.clientY >= rect.top - 40 && e.clientY <= rect.bottom + 40;
        if (inX && inY && s.dist < bestDist && s.dist < 80) {
          bestDist = s.dist; bestTarget = panel; bestSide = s;
        }
      });
    });

    if (bestTarget && bestSide) {
      const wsRect = workspace.getBoundingClientRect();
      indicator.style.display = 'block';
      indicator.style.left = (bestSide.x - wsRect.left) + 'px';
      indicator.style.top  = (bestSide.y - wsRect.top) + 'px';
      indicator.style.width  = bestSide.w + 'px';
      indicator.style.height = bestSide.h + 'px';
      indicator.dataset.targetPanel = bestTarget.dataset.panelId;
      indicator.dataset.side = bestSide.side;
    } else {
      indicator.style.display = 'none';
    }
  }

  function onDragEnd() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('mousemove', onPreDragMove);
    document.removeEventListener('mouseup', cancelLongPress);
    clearTimeout(longPressTimer); longPressTimer = null;

    if (isDragging && dragSource) {
      const indicator = dropIndicator;
      if (indicator && indicator.style.display !== 'none') {
        const targetId = indicator.dataset.targetPanel;
        const side = indicator.dataset.side;
        const sourceId = dragSource.dataset.panelId;
        if (targetId && sourceId !== targetId) {
          panelOrder = panelOrder.filter(id => id !== sourceId);
          const targetIdx = panelOrder.indexOf(targetId);
          // Only `left`/`right` drops can fire (top/bottom rejected upstream).
          if (side === 'left') panelOrder.splice(targetIdx, 0, sourceId);
          else panelOrder.splice(targetIdx + 1, 0, sourceId);
          rebuildLayout();
        }
      }
      dragSource.style.transform = '';
      dragSource.style.transition = '';
      dragSource.classList.remove('panel-grab-ready', 'drag-source');
      workspace.classList.remove('workspace-dragging');
      if (dropIndicator) dropIndicator.style.display = 'none';
    }
    isDragging = false;
    dragSource = null;
  }

  // ── Attach long-press to all panels ──
  workspace.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.ws-divider')) return;
    const panel = e.target.closest('.ws-panel');
    if (!panel) return;

    // Avoid drag from resize hotzone edges
    const rect = panel.getBoundingClientRect();
    const EDGE = 10;
    if (e.clientX <= rect.left + EDGE || e.clientX >= rect.right - EDGE) return;
    if (e.clientY <= rect.top + EDGE || e.clientY >= rect.bottom - EDGE) return;

    // Don't interfere with interactive elements
    if (e.target.closest('button, input, textarea, a, select, .controls-tray, .list-view')) return;

    // Need at least 2 visible panels to drag
    if (getVisiblePanels().length < 2) return;

    startLongPress(panel, e);
  });

  // ── Panel edge resize ──
  let resizing = false, resizePanel = null, resizeEdge = '';
  let resizeStartX = 0, resizeStartY = 0, resizeStartW = 0, resizeStartH = 0;

  function getResizeEdge(panel, e) {
    const rect = panel.getBoundingClientRect();
    const wsRect = workspace.getBoundingClientRect();
    const E = 8;
    const T = 2; // tolerance for "edge sits at workspace boundary"
    // Edges that touch the workspace boundary aren't resizable — there's no
    // adjacent panel to give/take space, and width-only resizes on the
    // outermost panel cause it to narrow from the opposite edge (the edge
    // anchored by flex layout). Skip those hotzones.
    const atWsLeft   = Math.abs(rect.left   - wsRect.left)   < T;
    const atWsRight  = Math.abs(rect.right  - wsRect.right)  < T;
    const atWsTop    = Math.abs(rect.top    - wsRect.top)    < T;
    const atWsBottom = Math.abs(rect.bottom - wsRect.bottom) < T;
    const onL = !atWsLeft   && e.clientX >= rect.left   - E && e.clientX <= rect.left   + E;
    const onR = !atWsRight  && e.clientX >= rect.right  - E && e.clientX <= rect.right  + E;
    const onB = !atWsBottom && e.clientY >= rect.bottom - E && e.clientY <= rect.bottom + E;
    const onT = !atWsTop    && e.clientY >= rect.top    - E && e.clientY <= rect.top    + E;
    if ((onL || onR) && onB) return (onL ? 'left' : 'right') + '-bottom';
    if ((onL || onR) && onT) return (onL ? 'left' : 'right') + '-top';
    if (onL) return 'left'; if (onR) return 'right';
    if (onB) return 'bottom'; if (onT) return 'top';
    return '';
  }

  function getCursorForEdge(edge) {
    if (edge.includes('bottom') && edge.includes('left'))  return 'nesw-resize';
    if (edge.includes('bottom') && edge.includes('right')) return 'nwse-resize';
    if (edge.includes('top') && edge.includes('left'))     return 'nwse-resize';
    if (edge.includes('top') && edge.includes('right'))    return 'nesw-resize';
    if (edge === 'left' || edge === 'right') return 'col-resize';
    if (edge === 'bottom' || edge === 'top') return 'row-resize';
    return '';
  }

  workspace.addEventListener('mousedown', function(e) {
    if (e.target.closest('.ws-divider')) return;
    const panel = e.target.closest('.ws-panel');
    if (!panel) return;
    const edge = getResizeEdge(panel, e);
    if (!edge) return;
    e.preventDefault();
    resizing = true; resizePanel = panel; resizeEdge = edge;
    resizeStartX = e.clientX; resizeStartY = e.clientY;
    resizeStartW = panel.offsetWidth; resizeStartH = panel.offsetHeight;

    const SNAP_DIST = 12;
    function getSnapTargets(exclude) {
      const wsRect = workspace.getBoundingClientRect();
      const t = { xs: [wsRect.left, wsRect.right], ys: [wsRect.top, wsRect.bottom] };
      workspace.querySelectorAll('.ws-panel').forEach(p => {
        if (p === exclude || p.offsetWidth === 0) return;
        const r = p.getBoundingClientRect();
        t.xs.push(r.left, r.right); t.ys.push(r.top, r.bottom);
      });
      return t;
    }
    function snap(val, targets) {
      for (const t of targets) { if (Math.abs(val - t) < SNAP_DIST) return t; }
      return val;
    }

    const onMove = (ev) => {
      if (!resizing) return;
      const snapEdges = getSnapTargets(resizePanel);
      const panelRect = resizePanel.getBoundingClientRect();
      if (resizeEdge.includes('left') || resizeEdge.includes('right')) {
        const dx = resizeEdge.includes('right') ? (ev.clientX - resizeStartX) : (resizeStartX - ev.clientX);
        let newW = Math.max(260, resizeStartW + dx);
        if (resizeEdge.includes('right')) newW = snap(panelRect.left + newW, snapEdges.xs) - panelRect.left;
        else newW = panelRect.right - snap(panelRect.right - newW, snapEdges.xs);
        resizePanel.style.width = Math.max(260, newW) + 'px';
        resizePanel.style.flex = 'none';
      }
      if (resizeEdge.includes('bottom') || resizeEdge.includes('top')) {
        const dy = resizeEdge.includes('top') ? (resizeStartY - ev.clientY) : (ev.clientY - resizeStartY);
        let newH = Math.max(150, resizeStartH + dy);
        if (resizeEdge.includes('bottom')) newH = snap(panelRect.top + newH, snapEdges.ys) - panelRect.top;
        else newH = panelRect.bottom - snap(panelRect.bottom - newH, snapEdges.ys);
        resizePanel.style.height = Math.max(150, newH) + 'px';
        resizePanel.style.flex = 'none';
      }
    };
    const onUp = () => {
      resizing = false; resizePanel = null; resizeEdge = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Cursor hint on hover near panel edges
  workspace.addEventListener('mousemove', function(e) {
    if (resizing || isDragging || divDragging) return;
    const panel = e.target.closest('.ws-panel');
    if (!panel) return;
    const edge = getResizeEdge(panel, e);
    panel.style.cursor = getCursorForEdge(edge);
  });

  // Watch for panel open/close and rebuild layout
  let rebuildScheduled = false;
  const observer = new MutationObserver((mutations) => {
    if (rebuildScheduled) return;
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        const el = m.target;
        if (el.classList.contains('ws-panel') && el.dataset.panelId !== 'flashcard') {
          const isOpen = el.classList.contains('open');
          if (isOpen && !panelOrder.includes(el.dataset.panelId)) {
            panelOrder.push(el.dataset.panelId);
          }
          rebuildScheduled = true;
          requestAnimationFrame(() => { rebuildScheduled = false; rebuildLayout(); });
        }
      }
    }
  });
  workspace.querySelectorAll('.ws-panel').forEach(el => {
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  });

  // Public API
  window.workspaceRebuild = rebuildLayout;
  window.workspaceSetDirection = function(dir) { layoutDirection = dir; rebuildLayout(); };

  // Initial build
  rebuildLayout();
}

// ══════════════════════════════════════════
