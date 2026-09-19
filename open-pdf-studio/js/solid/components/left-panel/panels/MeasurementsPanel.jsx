import { For, Show, createMemo } from 'solid-js';
import { activeTab } from '../../../stores/leftPanelStore.js';
import { state, getActiveDocument } from '../../../../core/state.js';
import { getScaleForPoint } from '../../../../annotations/scale-bar.js';
import { redrawAnnotations, redrawContinuous } from '../../../../annotations/rendering.js';
import { showProperties } from '../../../../ui/panels/properties-panel.js';
import { goToPage } from '../../../../pdf/renderer.js';
import { recordDelete } from '../../../../core/undo-manager.js';
import { useTranslation } from '../../../../i18n/useTranslation.js';
import { groepeerMetingen } from '../../../../annotations/meting-groepering.js';

function redraw() {
  const doc = getActiveDocument();
  if (doc?.viewMode === 'continuous') redrawContinuous();
  else redrawAnnotations();
}

const measureTypes = new Set(['measureDistance', 'measureArea', 'measurePerimeter', 'measureAngle']);

const typeLabels = {
  measureDistance: 'Distance',
  measureArea: 'Area',
  measurePerimeter: 'Perimeter',
  measureAngle: 'Angle',
};

const typeIcons = {
  measureDistance: '\u2194',
  measureArea: '\u25A1',
  measurePerimeter: '\u25B3',
  measureAngle: '\u2220',
};

export default function MeasurementsPanel() {
  const { t } = useTranslation('properties');

  // ── Current scale ──
  const currentScale = createMemo(() => {
    const doc = getActiveDocument();
    const ms = doc?.measureScale;
    if (ms && ms.pixelsPerUnit > 0) {
      if (ms.scaleRatio) return ms.scaleRatio;
      return `1px = ${(1 / ms.pixelsPerUnit).toFixed(4)} ${ms.unit}`;
    }
    return null;
  });

  // ── Viewports ──
  const viewports = createMemo(() => {
    const doc = getActiveDocument();
    if (!doc) return [];
    return (doc.annotations || []).filter(a => a.type === 'viewport');
  });

  // ── Measurements ──
  const measurements = createMemo(() => {
    const doc = getActiveDocument();
    if (!doc) return [];
    return (doc.annotations || []).filter(a => measureTypes.has(a.type));
  });

  // ── Gegroepeerd op de naam van het gereedschap ──
  // Niet op type: de calculator leest zijn eigen posten ("SM-01 Binnenwanden"),
  // over alle bladen heen. Naamloze metingen vallen terug op hun type.
  const groups = createMemo(() => groepeerMetingen(measurements(), (type) => typeLabels[type] || type));

  /** Het totaal zoals het in de kop van een groep komt te staan. */
  function groepTotaal(g) {
    if (g.items.every(m => m.type === 'measureAngle')) return g.items.length + ' \u00D7';
    if (!g.som) return '';
    if (g.som.waarde == null) return '\u2014';  // eenheden niet gelijk te trekken
    return g.som.waarde.toFixed(2) + (g.som.eenheid ? ' ' + g.som.eenheid : '');
  }

  // ── Click to navigate ──
  function navigateTo(ann) {
    const doc = getActiveDocument();
    if (!doc) return;

    // Go to the page
    if (doc.currentPage !== ann.page) {
      goToPage(ann.page);
    }

    // Select the annotation
    doc.selectedAnnotations = [ann];
    doc.selectedAnnotation = ann;
    showProperties(ann);
    redraw();
  }

  function deleteViewport(ann) {
    const doc = getActiveDocument();
    if (!doc) return;
    const idx = doc.annotations.indexOf(ann);
    if (idx !== -1) {
      recordDelete(ann, idx);
      doc.annotations.splice(idx, 1);
      redraw();
    }
  }

  return (
    <div class={`left-panel-content${activeTab() === 'measurements' ? ' active' : ''}`} id="panel-measurements">
      <div class="left-panel-header">
        <span>{t('leftPanel.measurements') || 'Measurements'}</span>
      </div>

      {/* ── Scale Section ── */}
      <div class="measurements-section">
        <div class="measurements-section-header">
          <span>{t('measurements.scale') || 'Scale'}</span>
        </div>
        <div class="measurements-scale-display">
          <Show when={currentScale()} fallback={
            <span class="measurements-empty">{t('measurements.noScale') || 'No scale set'}</span>
          }>
            <span class="measurements-scale-value">{currentScale()}</span>
          </Show>
        </div>
      </div>

      {/* ── Viewports Section ── */}
      <div class="measurements-section">
        <div class="measurements-section-header">
          <span>{t('measurements.viewports') || 'Viewports'}</span>
          <span class="measurements-count">{viewports().length}</span>
        </div>
        <Show when={viewports().length === 0}>
          <div class="measurements-empty">{t('measurements.noViewports') || 'No viewports defined'}</div>
        </Show>
        <For each={viewports()}>
          {(vp) => (
            <div class="measurements-item" onClick={() => navigateTo(vp)}>
              <div class="measurements-item-icon" style={{ color: '#0066cc' }}>&#9634;</div>
              <div class="measurements-item-info">
                <div class="measurements-item-name">{vp.name || vp.scaleRatio || 'Viewport'}</div>
                <div class="measurements-item-detail">
                  {vp.scaleRatio || `1px = ${(1/vp.pixelsPerUnit).toFixed(4)} ${vp.unit}`}
                  {' \u2022 Page ' + vp.page}
                </div>
              </div>
              <button class="measurements-item-delete" title="Delete" onClick={(e) => { e.stopPropagation(); deleteViewport(vp); }}>
                &times;
              </button>
            </div>
          )}
        </For>
      </div>

      {/* ── Measurements Section ── */}
      <div class="measurements-section">
        <div class="measurements-section-header">
          <span>{t('measurements.measurements') || 'Measurements'}</span>
          <span class="measurements-count">{measurements().length}</span>
        </div>
        <Show when={measurements().length === 0}>
          <div class="measurements-empty">{t('measurements.noMeasurements') || 'No measurements yet'}</div>
        </Show>
        <For each={groups()}>
          {(g) => (
            <div class="measurements-group" classList={{ 'is-naamloos': !g.benoemd }}>
              <div class="measurements-group-header">
                <span>{g.naam}</span>
                <span class="measurements-group-total">{groepTotaal(g)}</span>
              </div>
              <For each={g.items}>
                {(m) => (
                  <div class="measurements-item" classList={{ selected: getActiveDocument()?.selectedAnnotation?.id === m.id }}
                    onClick={() => navigateTo(m)}>
                    <div class="measurements-item-icon">{typeIcons[m.type] || '\u2022'}</div>
                    <div class="measurements-item-info">
                      {/* De groepskop draagt al de naam; de regel zelf toont
                          dus de gemeten waarde en het blad waar hij staat. */}
                      <div class="measurements-item-name">{m.measureText || m.label || 'Measurement'}</div>
                      <div class="measurements-item-detail">{(t('leftPanel.page') || 'Page') + ' ' + m.page}</div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
