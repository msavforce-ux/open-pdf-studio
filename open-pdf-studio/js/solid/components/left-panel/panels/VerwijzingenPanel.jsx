import { For, Show, createMemo } from 'solid-js';
import { activeTab } from '../../../stores/leftPanelStore.js';
import { getActiveDocument } from '../../../../core/state.js';
import { useTranslation } from '../../../../i18n/useTranslation.js';
import {
  verwijzingen, bezig, gebouwdVoor, voortgang, fout, bouwVerwijzingen, openVerwijzing,
} from '../../../stores/verwijzingStore.js';

export default function VerwijzingenPanel() {
  const { t } = useTranslation('properties');

  // Gegroepeerd op het blad dat de codes beschrijft: zo zie je in één oogopslag
  // dat L-1..L-3 samen in de ramenstaat staan en BST-1 ergens anders.
  const perDefinitie = createMemo(() => {
    const m = new Map();
    for (const v of verwijzingen()) {
      const k = v.definitie == null ? 0 : v.definitie;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(v);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  });

  const actueel = () => gebouwdVoor() === getActiveDocument()?.id;

  return (
    <div class="left-panel-content" classList={{ active: activeTab() === 'verwijzingen' }}>
      <div class="left-panel-header">
        <span>{t('verwijzingen.title') || 'Sheet references'}</span>
        <button class="schedule-header-btn" disabled={bezig()} onClick={bouwVerwijzingen}>
          {bezig()
            ? (voortgang() ? `${voortgang().blad}/${voortgang().totaal}` : (t('verwijzingen.busy') || 'Scanning…'))
            : (t('verwijzingen.scan') || 'Scan')}
        </button>
      </div>

      <Show when={fout()}>
        <div class="measurements-empty" style="color:#e06c6c;">
          {(t('verwijzingen.failed') || 'Scan failed') + ': ' + fout()}
        </div>
      </Show>

      <Show when={actueel()} fallback={
        <div class="measurements-empty">
          {t('verwijzingen.hint') || 'Scan the set to find codes like L-1, BS-2 and the sheet that describes them.'}
        </div>
      }>
        <Show when={verwijzingen().length} fallback={
          <div class="measurements-empty">{t('verwijzingen.none') || 'No sheet references found'}</div>
        }>
          <For each={perDefinitie()}>
            {([blad, codes]) => (
              <div class="measurements-group">
                <div class="measurements-group-header">
                  <span>
                    {blad
                      ? `${t('verwijzingen.describedOn') || 'Described on sheet'} ${blad}`
                      : (t('verwijzingen.noSheet') || 'No describing sheet')}
                  </span>
                  <span class="measurements-group-total">{codes.length}</span>
                </div>
                <For each={codes}>
                  {(v) => (
                    <div class="measurements-item"
                      classList={{ 'is-naamloos': v.definitie == null }}
                      onClick={() => v.definitie != null && openVerwijzing(v.code)}>
                      <div class="measurements-item-info">
                        <div class="measurements-item-name">{v.code}</div>
                        <div class="measurements-item-detail">
                          {(t('verwijzingen.usedOn') || 'Used on') + ' ' + v.bladen.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            )}
          </For>
        </Show>
      </Show>
    </div>
  );
}
