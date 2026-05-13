// ══════════════════════════════════════════════════════════
// 32-phases.js — Phase Selection & Input Validation
// Features:
//   • Phase checkboxes — run only the phases you need
//   • phaseShouldRun(n) — called by 22-pipeline.js
//   • Input validation for ZIP, radius, capacity, budget
//   • Inline tip messages under each invalid field
//   • Patches runPipeline to validate before launching
// ══════════════════════════════════════════════════════════

// ── Phase enable/disable state ────────────────────────────────
const _phaseEnabled = {
  1:true, 2:true, 3:true, 4:true,  5:true,  6:true,
  7:true, 8:true, 9:true, 10:true, 11:true, 12:true,
};

/**
 * Called inside runPipeline() at each phase.
 * Returns false when user has unchecked that phase — skip its agents.
 */
function phaseShouldRun(n) {
  return _phaseEnabled[n] !== false;
}

function togglePhase(n, checkbox) {
  _phaseEnabled[n] = checkbox.checked;
}

function phaseSelectAll(ev) {
  if (ev) ev.stopPropagation();
  for (let n = 1; n <= 12; n++) {
    _phaseEnabled[n] = true;
    const cb = $('phase-cb-' + n);
    if (cb) cb.checked = true;
  }
}

function phaseSelectNone(ev) {
  if (ev) ev.stopPropagation();
  for (let n = 1; n <= 12; n++) {
    _phaseEnabled[n] = false;
    const cb = $('phase-cb-' + n);
    if (cb) cb.checked = false;
  }
}

// ── Quick presets ─────────────────────────────────────────────
const _PHASE_PRESETS = {
  quick:      { phases: [1,2,3,4,5,6],         label: 'Quick Verdict',   cost: '~$0.15',  time: '~2 min'  },
  foundation: { phases: [1],                    label: 'Foundation Only', cost: '~$0.06',  time: '~1 min'  },
  financial:  { phases: [1,2,3,4,5],            label: 'Thru Financials', cost: '~$0.20',  time: '~3 min'  },
  full:       { phases: [1,2,3,4,5,6,7,8,9,10,11,12], label: 'Full Report', cost: '~$0.40', time: '~8 min' },
};

function setPhasePreset(name) {
  const preset = _PHASE_PRESETS[name];
  if (!preset) return;
  for (let n = 1; n <= 12; n++) {
    _phaseEnabled[n] = preset.phases.includes(n);
    const cb = $('phase-cb-' + n);
    if (cb) cb.checked = !!_phaseEnabled[n];
  }
  // Highlight active preset button
  document.querySelectorAll('.phase-preset-btn').forEach(b => b.classList.remove('active'));
  const btn = $('preset-' + name);
  if (btn) btn.classList.add('active');
}

function togglePhasePanel() {
  const panel = $('phasePanel');
  const btn   = $('phasePanelBtn');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.textContent = isOpen ? '⚙ Phases' : '⚙ Phases ▲';
}

// ── Input validation ──────────────────────────────────────────
// Max capacity by industry; min budget by industry
const _capMax = { daycare:300, gas_station:32, laundromat:100, car_wash:20,
                  restaurant:500, gym:5000, indoor_play:2000, dry_cleaning:2000,
                  senior_care:50, tutoring:200, urgent_care:20, coffee_shop:150, barbershop:30, coworking:500,
                  medical_practice:20, optometry:12 };
const _budMin = { daycare:150000, gas_station:500000, laundromat:100000, car_wash:300000,
                  restaurant:100000, gym:150000, indoor_play:200000, dry_cleaning:100000,
                  senior_care:600000, tutoring:80000, urgent_care:400000, coffee_shop:100000, barbershop:60000, coworking:200000,
                  medical_practice:200000, optometry:150000 };

const _tipText = {
  zip:      'Must be a valid 5-digit US ZIP code (e.g. 30097)',
  radius:   'Enter a search radius between 10 and 150 miles',
  capacity: '',   // set dynamically
  budget:   '',   // set dynamically
};

function _setTip(id, msg, isError) {
  const el = $('tip-' + id);
  const inp = $(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
  el.className = 'input-tip ' + (isError ? 'tip-error' : 'tip-ok');
  if (inp) inp.style.borderColor = isError ? 'var(--red)' : (msg ? 'var(--green)' : '');
}

function validateInputs() {
  const ind  = $('industrySelect') ? $('industrySelect').value : 'daycare';
  const zipV = $('zip')      ? $('zip').value.trim()     : '';
  const radV = $('radius')   ? $('radius').value.trim()  : '';
  const capV = $('capacity') ? $('capacity').value.trim(): '';
  const budV = $('budget')   ? $('budget').value.trim()  : '';
  let ok = true;

  // ZIP
  if (!/^\d{5}$/.test(zipV)) {
    _setTip('zip', 'Must be exactly 5 digits', true); ok = false;
  } else { _setTip('zip', '', false); }

  // Radius
  const rad = parseInt(radV);
  if (isNaN(rad) || rad < 10 || rad > 150) {
    _setTip('radius', 'Enter a value between 10 and 150', true); ok = false;
  } else { _setTip('radius', '', false); }

  // Capacity
  const cap = parseInt(capV);
  const maxCap = _capMax[ind] || 9999;
  if (isNaN(cap) || cap < 1) {
    _setTip('capacity', 'Enter a positive number', true); ok = false;
  } else if (cap > maxCap) {
    _setTip('capacity', `Typical max for ${ind.replace('_',' ')} is ${maxCap}`, true); ok = false;
  } else { _setTip('capacity', '', false); }

  // Budget
  const bud = parseInt(budV);
  const minBud = _budMin[ind] || 50000;
  if (isNaN(bud) || bud < 50000) {
    _setTip('budget', 'Minimum budget is $50,000', true); ok = false;
  } else if (bud < minBud) {
    _setTip('budget', `Typical minimum for ${ind.replace('_',' ')} is $${(minBud/1000).toFixed(0)}k`, true); ok = false;
  } else { _setTip('budget', '', false); }

  return ok;
}

function clearValidation() {
  ['zip','radius','capacity','budget'].forEach(id => {
    _setTip(id, '', false);
    const el = $(id);
    if (el) el.style.borderColor = '';
  });
}

// Show guidance tips as the user types
function _bindGuidanceTips() {
  const hints = {
    zip:      '5-digit US ZIP code',
    radius:   '10 – 150 miles',
    capacity: 'Number of units/slots for this business type',
    budget:   'Total startup investment budget (USD)',
  };
  Object.entries(hints).forEach(([id, hint]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('focus', () => { if (!el.value) _setTip(id, hint, false); });
    el.addEventListener('blur',  () => {
      // Only validate on blur if field has been touched
      const tip = $('tip-' + id);
      if (tip && tip.classList.contains('tip-ok') && el.value) {
        // Keep guidance tip visible briefly, then clear
        setTimeout(() => _setTip(id, '', false), 1500);
      }
    });
  });
}

// ── Patch runPipeline to validate first ──────────────────────
(function patchRunPipelineForValidation() {
  // Wait for DOMContentLoaded so runPipeline is definitely available
  document.addEventListener('DOMContentLoaded', function() {
    const _orig = window.runPipeline;
    if (!_orig) return;
    window.runPipeline = async function() {
      if (!validateInputs()) {
        showErr('Please fix the highlighted input errors before running the pipeline.');
        return;
      }
      clearValidation();
      return _orig.apply(this, arguments);
    };
    _bindGuidanceTips();
  });
})();
