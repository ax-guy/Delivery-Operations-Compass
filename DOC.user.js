// ==UserScript==
// @name         DOC - Delivery Operations Copilot Prototype
// @namespace    levelaccess.delivery.doc
// @version      0.1.0
// @description  Context-aware delivery intelligence prototype for Jira, Tempo, Confluence, SharePoint and reporting pages.
// @match        https://*.atlassian.net/*
// @match        https://*.sharepoint.com/*
// @match        https://app.powerbi.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const APP = { name: 'Delivery Operations Copilot', short: 'DOC', version: '0.1.0' };
  const STORE = { capacity: 'doc.capacity.v1', settings: 'doc.settings.v1', rules: 'doc.rules.v1' };
  const DEFAULT_RULES = {
    standardWorkdayHours: 7,
    evaluationHoursPerPage: 4.5,
    validationDefaultHoursPerFinding: 0.25,
    scopingHours: 10,
    triageSetupHours: 2,
    finalReviewHours: 0.5,
    planningWindowWeeks: 3,
    warningUtilizationPct: 90,
    criticalUtilizationPct: 110,
    staleSourceDays: 7
  };

  const state = {
    context: null,
    scan: null,
    capacity: load(STORE.capacity, []),
    rules: { ...DEFAULT_RULES, ...load(STORE.rules, {}) },
    panelOpen: true,
    activeTab: 'overview'
  };

  function load(key, fallback) {
    try {
      const raw = typeof GM_getValue === 'function' ? GM_getValue(key) : localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function save(key, value) {
    const raw = JSON.stringify(value);
    if (typeof GM_setValue === 'function') GM_setValue(key, raw);
    else localStorage.setItem(key, raw);
  }

  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const visible = el => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const number = value => {
    const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const dateValue = value => {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const serial = Number(value);
    if (Number.isFinite(serial) && serial > 25000) return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return null;
  };
  const formatDate = date => date instanceof Date && !Number.isNaN(date) ? date.toLocaleDateString() : 'Unknown';
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function detectPage() {
    const host = location.hostname;
    const path = location.pathname;
    const title = document.title;
    let system = 'unknown', type = 'unknown';
    if (/atlassian\.net$/.test(host)) {
      system = 'atlassian';
      if (/\/browse\/[A-Z][A-Z0-9]+-\d+/i.test(path) || document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')) type = 'jira-issue';
      else if (/tempo/i.test(path + title)) type = 'tempo';
      else if (/\/jira\/software\/c\/projects\/.+\/boards\//i.test(path)) type = 'jira-board';
      else if (/\/issues\//i.test(path)) type = 'jira-search';
      else if (/\/wiki\//i.test(path)) type = 'confluence';
      else type = 'atlassian-other';
    } else if (/sharepoint\.com$/.test(host)) { system = 'microsoft'; type = 'sharepoint'; }
    else if (/powerbi\.com$/.test(host)) { system = 'microsoft'; type = 'powerbi'; }
    return { system, type, host, path, title, url: location.href, detectedAt: new Date().toISOString() };
  }

  function firstText(selectors) {
    for (const selector of selectors) {
      const value = text([...document.querySelectorAll(selector)].find(visible));
      if (value) return value;
    }
    return '';
  }

  function fieldByLabel(labelPattern) {
    const candidates = [...document.querySelectorAll('label, dt, [data-testid*="field"], [class*="field"]')].filter(visible);
    for (const candidate of candidates) {
      const label = text(candidate);
      if (!labelPattern.test(label) || label.length > 120) continue;
      const control = candidate.querySelector('input, textarea, select, [contenteditable="true"]');
      if (control) return control.value || text(control);
      const parent = candidate.closest('div, section, dl') || candidate.parentElement;
      if (parent) {
        const values = [...parent.querySelectorAll('dd, input, textarea, select, [data-testid*="value"], [class*="value"]')].map(el => el.value || text(el)).filter(Boolean);
        if (values.length) return values[values.length - 1];
      }
    }
    return '';
  }

  function extractJiraIssue() {
    const key = location.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/i)?.[1]
      || firstText(['[data-testid*="current-issue"]', '[data-testid*="issue-key"]']);
    const summary = firstText(['h1', '[data-testid*="summary"]']);
    const status = firstText(['[data-testid*="status"] button', '[data-testid*="status"]', '[id*="status"]']);
    const assignee = fieldByLabel(/^assignee$/i) || firstText(['[data-testid*="assignee"]']);
    const dueDate = fieldByLabel(/^due date$/i) || firstText(['[data-testid*="due-date"]']);
    const pageCountRaw = fieldByLabel(/^(estimated )?(pages|modules|page count)$/i);
    const requestType = fieldByLabel(/^(request|service|issue) type$/i);
    const priority = fieldByLabel(/^priority$/i);
    return { key, summary, status, assignee, dueDate, pageCount: number(pageCountRaw), requestType, priority, sourceUrl: location.href };
  }

  function inspectPage() {
    const interactive = [...document.querySelectorAll('button, [role="button"], details, [aria-expanded], [role="tab"], select')].filter(visible);
    const pagination = interactive.filter(el => /next|previous|page \d|show more|load more/i.test(text(el) + ' ' + (el.getAttribute('aria-label') || '')));
    const accordions = interactive.filter(el => el.tagName === 'DETAILS' || el.hasAttribute('aria-expanded'));
    const rows = [...document.querySelectorAll('table tbody tr, [role="row"]')].filter(visible);
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    return { rows: rows.length, interactive: interactive.length, pagination: pagination.length, accordions: accordions.length, dialogs: dialogs.length, capturedAt: new Date().toISOString() };
  }

  async function deepScan() {
    const abort = new AbortController();
    state.scanAbort = abort;
    updateStatus('Deep scan running. Use Cancel to stop.');
    const result = { pagesVisited: 1, expanded: 0, rows: [], warnings: [], startedAt: new Date().toISOString() };
    const collect = () => {
      const seen = new Set(result.rows.map(r => r.join('\u241f')));
      [...document.querySelectorAll('table tbody tr, [role="row"]')].filter(visible).forEach(row => {
        const cells = [...row.querySelectorAll('th, td, [role="cell"], [role="gridcell"]')].map(text).filter(Boolean);
        const sig = cells.join('\u241f');
        if (cells.length && !seen.has(sig)) { seen.add(sig); result.rows.push(cells); }
      });
    };
    const waitStable = (ms = 650) => new Promise(resolve => setTimeout(resolve, ms));
    try {
      collect();
      const expanders = [...document.querySelectorAll('[aria-expanded="false"], details:not([open]) summary')].filter(visible).slice(0, 100);
      for (const el of expanders) {
        if (abort.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (/delete|remove|archive|close|submit|save/i.test(text(el))) continue;
        el.click(); result.expanded++; await waitStable(150); collect();
      }
      for (let i = 0; i < 50; i++) {
        if (abort.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        const next = [...document.querySelectorAll('button, [role="button"], a')].find(el => visible(el) && !el.disabled && /^(next|load more|show more)$/i.test((el.getAttribute('aria-label') || text(el)).trim()));
        if (!next) break;
        next.click(); result.pagesVisited++; await waitStable(); collect();
      }
      result.completedAt = new Date().toISOString();
      state.scan = result;
      updateStatus(`Deep scan complete: ${result.rows.length} rows captured across ${result.pagesVisited} page state(s).`);
    } catch (error) {
      result.cancelled = error?.name === 'AbortError';
      result.completedAt = new Date().toISOString();
      state.scan = result;
      updateStatus(result.cancelled ? 'Deep scan cancelled.' : `Scan stopped: ${error.message}`);
    }
    render();
  }

  function parseCsv(input) {
    const rows = [];
    let row = [], cell = '', quote = false;
    for (let i = 0; i < input.length; i++) {
      const c = input[i], n = input[i + 1];
      if (c === '"' && quote && n === '"') { cell += '"'; i++; }
      else if (c === '"') quote = !quote;
      else if (c === ',' && !quote) { row.push(cell); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quote) {
        if (c === '\r' && n === '\n') i++;
        row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    row.push(cell); if (row.some(v => v.trim())) rows.push(row);
    return rows;
  }

  const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  function findHeader(rows) {
    return rows.findIndex(row => row.some(cell => /consultant|employee|person|name/i.test(cell)) && row.some(cell => /capacity|booked|assigned/i.test(cell)));
  }
  function importCapacityCsv(csv) {
    const rows = parseCsv(csv);
    const hi = findHeader(rows);
    if (hi < 0) throw new Error('Could not locate a capacity header row. Include Consultant and capacity/workload columns.');
    const headers = rows[hi].map(norm);
    const pick = (record, patterns) => {
      const i = headers.findIndex(h => patterns.some(p => p.test(h)));
      return i >= 0 ? record[i] : '';
    };
    const records = rows.slice(hi + 1).map(record => {
      const name = pick(record, [/^consultant$/, /^employee$/, /^person$/, /^name$/]);
      if (!name || /available capacity|demand evals|missing items/i.test(name)) return null;
      return {
        name: name.trim(),
        testingCapacityPct: number(pick(record, [/testing capacity/, /^capacity %$/, /^capacity$/])),
        pagesAssigned: number(pick(record, [/pages ass/ , /assigned pages/])),
        evaluationHours: number(pick(record, [/eval total/, /evaluation hours/])),
        validationFindings: number(pick(record, [/validation findings/])),
        validationHoursPerFinding: number(pick(record, [/validation time/, /hours per finding/])),
        validationHours: number(pick(record, [/validation total/, /validation hours/])),
        vpatCount: number(pick(record, [/vpat authoring/, /vpat count/])),
        vpatHours: number(pick(record, [/vpat total/, /vpat hours/])),
        bookedHours: number(pick(record, [/^booked$/, /booked hours/])),
        ftoHours: number(pick(record, [/^fto$/, /pto/])),
        holidayHours: number(pick(record, [/holiday/])),
        firstAvailableDate: pick(record, [/first available/]),
        notes: pick(record, [/employee spoken time/, /^notes?$/]),
        potentialPages: number(pick(record, [/potential pages/])),
        potentialHoursLeft: number(pick(record, [/potential hours/])),
        smeHours: number(pick(record, [/sme hours/])),
        importedAt: new Date().toISOString()
      };
    }).filter(Boolean);
    state.capacity = records;
    save(STORE.capacity, records);
    return records;
  }

  function estimateIssue(issue) {
    const pages = issue?.pageCount;
    if (!Number.isFinite(pages)) return null;
    const testing = pages * state.rules.evaluationHoursPerPage;
    return { pages, testing, total: testing + state.rules.scopingHours + state.rules.triageSetupHours + state.rules.finalReviewHours };
  }

  function capacityMetrics(person) {
    const pct = person.testingCapacityPct || 0;
    const supply = state.rules.standardWorkdayHours * 5 * state.rules.planningWindowWeeks * pct / 100;
    const demand = person.bookedHours ?? ((person.evaluationHours || 0) + (person.validationHours || 0) + (person.vpatHours || 0) + (person.smeHours || 0) + (person.ftoHours || 0) + (person.holidayHours || 0));
    const remaining = supply - demand;
    const utilization = supply > 0 ? demand / supply * 100 : null;
    return { supply, demand, remaining, utilization };
  }

  function recommendations() {
    const issue = state.context?.issue;
    const recs = [];
    const estimate = estimateIssue(issue);
    if (state.context?.page.type === 'jira-issue') {
      if (!issue?.dueDate) recs.push({ level: 'warning', title: 'Due date missing', detail: 'This work item has no detected due date. Confirm the delivery commitment before planning capacity.' });
      if (!issue?.assignee) recs.push({ level: 'critical', title: 'Assignee missing', detail: 'No assignee was detected for this work item.' });
      if (!Number.isFinite(issue?.pageCount)) recs.push({ level: 'info', title: 'Scope not detected', detail: 'DOC could not detect a page or module count, so effort guidance is unavailable.' });
      if (estimate) recs.push({ level: 'info', title: 'Reference effort', detail: `${estimate.pages} pages × ${state.rules.evaluationHoursPerPage} hours/page plus scoping, setup, and review equals ${estimate.total.toFixed(1)} reference hours.` });
      const match = state.capacity.find(p => issue?.assignee && (norm(issue.assignee).includes(norm(p.name)) || norm(p.name).includes(norm(issue.assignee))));
      if (match) {
        const m = capacityMetrics(match);
        const level = m.utilization >= state.rules.criticalUtilizationPct ? 'critical' : m.utilization >= state.rules.warningUtilizationPct ? 'warning' : 'success';
        recs.push({ level, title: `${match.name} capacity`, detail: `${m.demand.toFixed(1)} planned hours against ${m.supply.toFixed(1)} reference hours (${m.utilization.toFixed(0)}%).` });
        if (estimate && m.remaining < estimate.total) recs.push({ level: 'warning', title: 'Capacity conflict', detail: `The reference estimate exceeds ${match.name}'s remaining three-week capacity by ${(estimate.total - m.remaining).toFixed(1)} hours.` });
      }
    }
    if (!state.capacity.length) recs.push({ level: 'info', title: 'Capacity data not loaded', detail: 'Import the capacity CSV to enable person and team recommendations.' });
    return recs;
  }

  function rosterHtml() {
    if (!state.capacity.length) return '<p class="doc-empty">No capacity data imported.</p>';
    return `<div class="doc-roster">${state.capacity.map(p => {
      const m = capacityMetrics(p); const level = m.utilization >= state.rules.criticalUtilizationPct ? 'critical' : m.utilization >= state.rules.warningUtilizationPct ? 'warning' : 'success';
      return `<article class="doc-card"><div class="doc-row"><strong>${escapeHtml(p.name)}</strong><span class="doc-badge ${level}">${m.utilization == null ? 'N/A' : m.utilization.toFixed(0) + '%'}</span></div><div class="doc-mini">${m.demand.toFixed(1)} booked / ${m.supply.toFixed(1)} reference hrs</div><div class="doc-meter"><span style="width:${Math.min(100, Math.max(0, m.utilization || 0))}%"></span></div><div class="doc-mini">Available: ${escapeHtml(p.firstAvailableDate || 'Not provided')}</div></article>`;
    }).join('')}</div>`;
  }

  function contextHtml() {
    const c = state.context; const issue = c.issue || {};
    return `<dl class="doc-kv"><div><dt>System</dt><dd>${escapeHtml(c.page.system)}</dd></div><div><dt>Page type</dt><dd>${escapeHtml(c.page.type)}</dd></div>${c.page.type === 'jira-issue' ? `<div><dt>Issue</dt><dd>${escapeHtml(issue.key || 'Not detected')}</dd></div><div><dt>Status</dt><dd>${escapeHtml(issue.status || 'Not detected')}</dd></div><div><dt>Assignee</dt><dd>${escapeHtml(issue.assignee || 'Not detected')}</dd></div><div><dt>Due date</dt><dd>${escapeHtml(issue.dueDate || 'Not detected')}</dd></div><div><dt>Pages</dt><dd>${issue.pageCount ?? 'Not detected'}</dd></div>` : ''}</dl>`;
  }

  function insightsHtml() {
    const recs = recommendations();
    return recs.map(r => `<article class="doc-insight ${r.level}"><h3>${escapeHtml(r.title)}</h3><p>${escapeHtml(r.detail)}</p></article>`).join('') || '<p class="doc-empty">No recommendations for the current context.</p>';
  }

  function scanHtml() {
    const s = state.context.scan;
    return `<div class="doc-card"><p><strong>Current page</strong></p><ul><li>${s.rows} visible data rows</li><li>${s.pagination} pagination controls</li><li>${s.accordions} expandable controls</li><li>${s.interactive} interactive elements</li></ul><div class="doc-actions"><button data-action="quick">Quick Scan</button><button data-action="deep">Deep Scan</button><button data-action="cancel">Cancel</button></div></div>${state.scan ? `<div class="doc-card"><strong>Last scan</strong><p>${state.scan.rows?.length || 0} rows, ${state.scan.pagesVisited || 1} page states, ${state.scan.expanded || 0} expanded controls.</p><button data-action="export-scan">Export Scan JSON</button></div>` : ''}`;
  }

  function settingsHtml() {
    return `<div class="doc-card"><label>Import capacity CSV<input id="doc-csv" type="file" accept=".csv,text/csv"></label><p class="doc-mini">The parser maps common Apollo headers and stores normalized data locally in this browser.</p></div><div class="doc-card"><h3>Rules</h3>${Object.entries(state.rules).map(([k,v]) => `<label>${escapeHtml(k)}<input data-rule="${escapeHtml(k)}" type="number" step="0.01" value="${v}"></label>`).join('')}<button data-action="save-rules">Save Rules</button></div><div class="doc-card"><button data-action="clear">Clear Local DOC Data</button></div>`;
  }

  function render() {
    let root = document.getElementById('doc-root');
    if (!root) { root = document.createElement('section'); root.id = 'doc-root'; root.setAttribute('aria-label', APP.name); document.body.appendChild(root); }
    const tabs = ['overview','capacity','scan','settings'];
    const content = state.activeTab === 'overview' ? `<h2>Current Context</h2>${contextHtml()}<h2>Guidance</h2>${insightsHtml()}` : state.activeTab === 'capacity' ? `<h2>Capacity</h2>${rosterHtml()}` : state.activeTab === 'scan' ? `<h2>Page Scanner</h2>${scanHtml()}` : `<h2>Settings</h2>${settingsHtml()}`;
    root.className = state.panelOpen ? 'open' : 'closed';
    root.innerHTML = `<button id="doc-toggle" aria-expanded="${state.panelOpen}" aria-controls="doc-panel"><span aria-hidden="true">DOC</span><span class="sr-only">${state.panelOpen ? 'Close' : 'Open'} Delivery Operations Copilot</span></button><div id="doc-panel"><header><div><strong>DOC</strong><span>Delivery Operations Copilot</span></div><small>Prototype ${APP.version}</small></header><nav aria-label="DOC views">${tabs.map(t => `<button data-tab="${t}" aria-current="${state.activeTab===t?'page':'false'}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</nav><main>${content}</main><footer id="doc-status" role="status">Ready</footer></div>`;
    bind();
  }

  function updateStatus(message) { const el = document.getElementById('doc-status'); if (el) el.textContent = message; }
  function download(name, data, type = 'application/json') {
    const blob = new Blob([data], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function bind() {
    document.getElementById('doc-toggle')?.addEventListener('click', () => { state.panelOpen = !state.panelOpen; render(); });
    document.querySelectorAll('#doc-root [data-tab]').forEach(b => b.addEventListener('click', () => { state.activeTab = b.dataset.tab; render(); }));
    document.querySelector('#doc-root [data-action="quick"]')?.addEventListener('click', () => { state.context = collectContext(); updateStatus('Quick scan refreshed.'); render(); });
    document.querySelector('#doc-root [data-action="deep"]')?.addEventListener('click', deepScan);
    document.querySelector('#doc-root [data-action="cancel"]')?.addEventListener('click', () => state.scanAbort?.abort());
    document.querySelector('#doc-root [data-action="export-scan"]')?.addEventListener('click', () => download(`doc-scan-${Date.now()}.json`, JSON.stringify(state.scan, null, 2)));
    document.querySelector('#doc-root [data-action="save-rules"]')?.addEventListener('click', () => { document.querySelectorAll('#doc-root [data-rule]').forEach(i => state.rules[i.dataset.rule] = Number(i.value)); save(STORE.rules, state.rules); updateStatus('Rules saved locally.'); render(); });
    document.querySelector('#doc-root [data-action="clear"]')?.addEventListener('click', () => { state.capacity=[]; state.rules={...DEFAULT_RULES}; save(STORE.capacity, []); save(STORE.rules, {}); updateStatus('Local DOC data cleared.'); render(); });
    document.getElementById('doc-csv')?.addEventListener('change', async event => { try { const count = importCapacityCsv(await event.target.files[0].text()).length; updateStatus(`${count} capacity records imported.`); state.activeTab='capacity'; render(); } catch (e) { updateStatus(e.message); } });
  }

  function collectContext() { const page = detectPage(); return { page, issue: page.type === 'jira-issue' ? extractJiraIssue() : null, scan: inspectPage() }; }
  GM_addStyle(`
    #doc-root{--bg:#101820;--panel:#fff;--ink:#182230;--muted:#596574;--brand:#5c2d91;--line:#d9dee7;--good:#107c10;--warn:#8a5a00;--bad:#b42318;position:fixed;right:16px;bottom:16px;z-index:2147483646;font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink)}
    #doc-toggle{width:56px;height:56px;border:0;border-radius:50%;background:var(--brand);color:white;font-weight:800;box-shadow:0 8px 28px #0005;cursor:pointer} #doc-panel{display:none;position:absolute;right:0;bottom:68px;width:min(420px,calc(100vw - 32px));height:min(720px,calc(100vh - 100px));background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:0 16px 48px #0005;overflow:hidden} #doc-root.open #doc-panel{display:grid;grid-template-rows:auto auto 1fr auto}
    #doc-panel header{background:var(--bg);color:white;padding:14px 16px;display:flex;justify-content:space-between;align-items:center} #doc-panel header div{display:grid} #doc-panel header strong{font-size:22px} #doc-panel header span,#doc-panel header small{color:#d7deea}
    #doc-panel nav{display:flex;overflow:auto;border-bottom:1px solid var(--line)} #doc-panel nav button{border:0;background:white;padding:10px 12px;cursor:pointer} #doc-panel nav button[aria-current="page"]{color:var(--brand);font-weight:700;border-bottom:3px solid var(--brand)} #doc-panel main{overflow:auto;padding:16px} #doc-panel footer{border-top:1px solid var(--line);padding:8px 14px;color:var(--muted);background:#f7f8fa}
    #doc-root h2{font-size:16px;margin:14px 0 8px} #doc-root h3{font-size:14px;margin:0 0 4px} .doc-card,.doc-insight{border:1px solid var(--line);border-radius:10px;padding:12px;margin:8px 0;background:white}.doc-insight{border-left:5px solid #2b6cb0}.doc-insight.warning{border-left-color:var(--warn)}.doc-insight.critical{border-left-color:var(--bad)}.doc-insight.success{border-left-color:var(--good)}.doc-insight p{margin:0}.doc-row{display:flex;justify-content:space-between;gap:10px}.doc-mini,.doc-empty{color:var(--muted);font-size:12px}.doc-badge{border-radius:20px;padding:2px 8px;background:#e8eef7}.doc-badge.warning{background:#fff1cc;color:#6b4600}.doc-badge.critical{background:#fee4e2;color:#8a1c13}.doc-badge.success{background:#dff6dd;color:#0b5f0b}.doc-meter{height:7px;background:#e8ebef;border-radius:8px;overflow:hidden;margin:7px 0}.doc-meter span{display:block;height:100%;background:var(--brand)}.doc-kv div{display:grid;grid-template-columns:110px 1fr;border-bottom:1px solid var(--line);padding:7px 0}.doc-kv dt{font-weight:700}.doc-kv dd{margin:0;overflow-wrap:anywhere}.doc-actions{display:flex;gap:6px;flex-wrap:wrap}#doc-root button{font:inherit}#doc-root main button{background:var(--brand);color:white;border:0;border-radius:6px;padding:7px 10px;cursor:pointer}#doc-root label{display:grid;gap:4px;margin:8px 0}#doc-root input{padding:7px;border:1px solid var(--line);border-radius:6px}.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
    @media (prefers-color-scheme:dark){#doc-root{--panel:#1b2430;--ink:#eef2f7;--muted:#b0bac8;--line:#3a4655}#doc-panel nav button,.doc-card,.doc-insight{background:#1b2430;color:var(--ink)}#doc-panel footer{background:#131b24}#doc-root input{background:#101820;color:white}}
    @media (prefers-reduced-motion:reduce){#doc-root *{scroll-behavior:auto!important;transition:none!important}}
  `);

  let lastUrl = location.href;
  const refresh = () => { state.context = collectContext(); render(); };
  new MutationObserver(() => { if (location.href !== lastUrl) { lastUrl = location.href; setTimeout(refresh, 600); } }).observe(document.documentElement, { subtree:true, childList:true });
  refresh();
})();
