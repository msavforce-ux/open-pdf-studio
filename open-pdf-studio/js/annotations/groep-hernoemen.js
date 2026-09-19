// Een hele groep metingen in één keer hernoemen.
//
// De staat groepeert op de naam van het gereedschap. Bleek die naam achteraf
// fout — een tikfout, of "wanden" moet "binnenwanden" worden — dan was de weg
// tot nu toe: elke meting apart aanklikken en in het eigenschappenpaneel
// hernoemen. Bij twintig metingen over vijf bladen is dat twintig keer, en
// mis je er één, dan valt die uit de som zonder dat iets het zegt.

/** Zowel label als subject: de staat leest label, de markup-lijst subject. */
export function hernoemMetingen(elementen, nieuweNaam) {
  const naam = String(nieuweNaam == null ? '' : nieuweNaam).trim();
  if (!naam) return 0;                      // naamloos bestaat niet
  let veranderd = 0;
  for (const el of elementen || []) {
    if (!el) continue;
    if (el.label === naam && el.subject === naam) continue;   // niets te doen
    el.label = naam;
    el.subject = naam;
    veranderd += 1;
  }
  return veranderd;
}

/** De elementen achter de rijen van één groep uit een staat-resultaat. */
export function elementenVanGroep(group) {
  return (group?.rows || []).map((r) => r.el).filter(Boolean);
}
