// Lintgroepen als losse paletten.
//
// Op een breed beeldscherm is het lint een rij knoppen bovenaan die je bij
// elke meting met de muis moet halen. Een calculator werkt urenlang met
// dezelfde handvol gereedschappen en wil ze naast de tekening hebben staan,
// verticaal, waar hij ze zelf neerzet.
//
// Er hoeft daarvoor niets nieuws gebouwd te worden: de applicatie heeft al
// een paletsysteem met slepen, zweven, links/rechts dokken en het onthouden
// van die keuze (js/plugins/palette-registry.js + ToolPalette.jsx). Deze
// module beschrijft de lintgroepen in de vorm die dat systeem al kent.

import {
  handIcon, lineIcon, arrowIcon, drawIcon, eraserIcon, rectIcon, polylineIcon,
  textboxIcon, noteIcon, ellipseIcon, circleIcon, calloutIcon, cloudIcon,
  measureDistanceIcon, measureAngleIcon, measurePerimeterIcon, measureAreaIcon,
  selectCommentsIcon,
} from './ribbonIcons.js';

const G = (id, tool, label, icon, group = 0) => ({
  id, tool, label, icon, group, translationKey: null, overrides: null,
});

/**
 * De groepen die als palet bruikbaar zijn. Bewust niet álle lintgroepen:
 * knippen/plakken en uitlijnen werken op een selectie en horen bij het
 * moment, niet naast de tekening.
 */
export const LINT_PALETTEN = [
  {
    id: 'lint-selection',
    label: 'Selection',
    translationKey: 'drawing.selection',
    icon: selectCommentsIcon,
    defaultVisible: false,
    defaultMode: 'docked-right',
    tools: [
      G('lp-select', 'select', 'Select', selectCommentsIcon),
      G('lp-hand', 'hand', 'Hand', handIcon),
    ],
  },
  {
    id: 'lint-draw',
    label: 'Draw',
    translationKey: 'drawing.draw',
    icon: drawIcon,
    defaultVisible: false,
    defaultMode: 'docked-right',
    tools: [
      G('lp-line', 'line', 'Line', lineIcon),
      G('lp-arrow', 'arrow', 'Arrow', arrowIcon),
      G('lp-draw', 'draw', 'Freehand', drawIcon),
      G('lp-polyline', 'polyline', 'Polyline', polylineIcon),
      G('lp-box', 'box', 'Rectangle', rectIcon),
      G('lp-circle', 'circle', 'Circle', circleIcon),
      G('lp-ellipse', 'ellipse', 'Ellipse', ellipseIcon),
      G('lp-cloud', 'cloud', 'Cloud', cloudIcon),
      G('lp-callout', 'callout', 'Callout', calloutIcon),
      G('lp-textbox', 'textbox', 'Text box', textboxIcon),
      G('lp-comment', 'comment', 'Note', noteIcon),
      G('lp-eraser', 'eraser', 'Eraser', eraserIcon),
    ],
  },
  {
    id: 'lint-measure',
    label: 'Measure',
    translationKey: 'drawing.annotate',
    icon: measureDistanceIcon,
    defaultVisible: false,
    defaultMode: 'docked-right',
    // Dezelfde inhoud als de lintgroep ANNOTATE, plus tellen: dat is wat er
    // bij een takeoff werkelijk gebruikt wordt.
    tools: [
      G('lp-marea', 'measureArea', 'Area', measureAreaIcon),
      G('lp-mdist', 'measureDistance', 'Length', measureDistanceIcon),
      G('lp-mperim', 'measurePerimeter', 'Perimeter', measurePerimeterIcon),
      G('lp-mangle', 'measureAngle', 'Angular', measureAngleIcon),
      G('lp-radius', 'radius', 'Radius', circleIcon),
      G('lp-diameter', 'diameter', 'Diameter', ellipseIcon),
      G('lp-callout2', 'callout', 'Leader', calloutIcon),
      G('lp-cloud2', 'cloud', 'Cloud', cloudIcon),
      G('lp-count', 'count', 'Count', rectIcon),
    ],
  },
  {
    id: 'lint-scale',
    label: 'Scale',
    translationKey: 'measure.scaleGroup',
    icon: measurePerimeterIcon,
    defaultVisible: false,
    defaultMode: 'docked-right',
    tools: [
      G('lp-scaleregion', 'scaleRegion', 'Scale region', measurePerimeterIcon),
      G('lp-calibrate', 'calibrate', 'Calibrate', measureDistanceIcon),
    ],
  },
];
