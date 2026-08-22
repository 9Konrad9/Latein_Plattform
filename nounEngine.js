// nounEngine.js
// Zentrale, wiederverwendbare Deklinations-Engine für Nomen.
// Deckt alle 6 im Lehrplan vorkommenden Deklinationsklassen vollständig ab:
// a-, o- (mask./fem. + Neutrum), konsonantische (mask./fem. + Neutrum), e-, u-Deklination.
// Einbinden per <script src="nounEngine.js"></script> NACH vocabulary.js.

const NounEngine = (() => {

    // ---- Hart zu automatisierende Einzelfälle (echte Unregelmäßigkeiten) ----
    // Diese Wörter weichen so stark vom regulären Muster ab, dass eine Herleitung
    // aus Genitiv + Deklinationsklasse nicht sinnvoll/korrekt möglich ist.
    const HARD_EXCEPTIONS = {
        'domus': {
            sg: { nom: 'domus', gen: 'domūs', dat: 'domuī', akk: 'domum', abl: 'domō' },
            pl: { nom: 'domūs', gen: 'domōrum', dat: 'domibus', akk: 'domōs', abl: 'domibus' }
        },
        'vīs': {
            // Genitiv und Dativ Sg. sind im klassischen Latein nicht gebräuchlich
            sg: { nom: 'vīs', gen: null, dat: null, akk: 'vim', abl: 'vī' },
            pl: { nom: 'vīrēs', gen: 'vīrium', dat: 'vīribus', akk: 'vīrēs', abl: 'vīribus' }
        },
        'sitis': {
            sg: { nom: 'sitis', gen: 'sitis', dat: 'sitī', akk: 'sitim', abl: 'sitī' },
            pl: { nom: 'sitēs', gen: 'sitium', dat: 'sitibus', akk: 'sitēs', abl: 'sitibus' }
        }
    };

    /**
     * Liest Genitiv-Stamm und Genus aus dem "middle"-Feld (z.B. "servī m." -> {genSg:"servī", gender:"m"}).
     * Entfernt vorher ein eventuelles " Pl." (bei reinen Pluraliatantum wie "castra").
     */
    function parseMiddle(middle) {
        const cleaned = middle.replace(/\s*Pl\.\s*$/, '');
        const m = cleaned.match(/^(.*?)\s*(m|f|n)\.\s*$/);
        return {
            genSg: m ? m[1].trim() : cleaned,
            gender: m ? m[2] : 'm'
        };
    }

    /**
     * Liest eine im gram_clue vermerkte Genitiv-Plural-Ausnahme aus (i-Stämme, z.B.
     * "Genitiv: urbis, f. (Gen. Pl. urbium)" -> "urbium"). Gibt null zurück, wenn nichts vermerkt ist.
     */
    function extractGenPlOverride(gramClue) {
        if (!gramClue) return null;
        const m = gramClue.match(/Gen\.\s*Pl\.\s*([a-zA-ZāēīōūĀĒĪŌŪ]+)/);
        return m ? m[1] : null;
    }

    /**
     * Liefert die vollständige Deklinationstabelle eines Nomens.
     * Rückgabe: { sg: {nom,gen,dat,akk,abl}, pl: {nom,gen,dat,akk,abl}, gender: 'm'|'f'|'n' }
     * Einzelne Werte können bei echten Lücken (z.B. vīs Gen./Dat. Sg.) null sein.
     */
    function decline(nounObj) {
        if (HARD_EXCEPTIONS[nounObj.latin]) {
            const ex = HARD_EXCEPTIONS[nounObj.latin];
            const { gender } = parseMiddle(nounObj.middle);
            return { sg: { ...ex.sg }, pl: { ...ex.pl }, gender };
        }

        const { genSg, gender } = parseMiddle(nounObj.middle);
        const gramClass = nounObj.gram_class;
        const nomSg = nounObj.latin;
        let stem, sg, pl;

        if (gramClass.includes('o-Deklination')) {
            stem = genSg.slice(0, -1); // "ī" entfernen
            if (gender === 'n') {
                sg = { nom: nomSg, gen: genSg, dat: stem + 'ō', akk: nomSg, abl: stem + 'ō' };
                pl = { nom: stem + 'a', gen: stem + 'ōrum', dat: stem + 'īs', akk: stem + 'a', abl: stem + 'īs' };
            } else {
                sg = { nom: nomSg, gen: genSg, dat: stem + 'ō', akk: stem + 'um', abl: stem + 'ō' };
                pl = { nom: stem + 'ī', gen: stem + 'ōrum', dat: stem + 'īs', akk: stem + 'ōs', abl: stem + 'īs' };
            }
        } else if (gramClass.includes('a-Deklination')) {
            stem = genSg.slice(0, -2); // "ae" entfernen
            sg = { nom: nomSg, gen: genSg, dat: genSg, akk: stem + 'am', abl: stem + 'ā' };
            pl = { nom: stem + 'ae', gen: stem + 'ārum', dat: stem + 'īs', akk: stem + 'ās', abl: stem + 'īs' };
        } else if (gramClass.includes('e-Deklination')) {
            stem = genSg.slice(0, -2); // "eī" entfernen (z.B. "reī" -> "r", "diēī" -> "di")
            sg = { nom: nomSg, gen: genSg, dat: genSg, akk: stem + 'em', abl: stem + 'ē' };
            pl = { nom: stem + 'ēs', gen: stem + 'ērum', dat: stem + 'ēbus', akk: stem + 'ēs', abl: stem + 'ēbus' };
        } else if (gramClass.includes('u-Deklination')) {
            stem = genSg.slice(0, -2); // "ūs" entfernen
            sg = { nom: nomSg, gen: genSg, dat: stem + 'uī', akk: stem + 'um', abl: stem + 'ū' };
            pl = { nom: stem + 'ūs', gen: stem + 'uum', dat: stem + 'ibus', akk: stem + 'ūs', abl: stem + 'ibus' };
        } else {
            // konsonantische Deklination (Standardfall, auch für i-Stämme wie urbs/nāvis)
            stem = genSg.slice(0, -2); // "is" entfernen
            let genPl = stem + 'um';
            const override = extractGenPlOverride(nounObj.gram_clue || '');
            if (override) genPl = override;

            if (gender === 'n') {
                sg = { nom: nomSg, gen: genSg, dat: stem + 'ī', akk: nomSg, abl: stem + 'e' };
                pl = { nom: stem + 'a', gen: genPl, dat: stem + 'ibus', akk: stem + 'a', abl: stem + 'ibus' };
            } else {
                sg = { nom: nomSg, gen: genSg, dat: stem + 'ī', akk: stem + 'em', abl: stem + 'e' };
                pl = { nom: stem + 'ēs', gen: genPl, dat: stem + 'ibus', akk: stem + 'ēs', abl: stem + 'ibus' };
            }
        }
        return { sg, pl, gender };
    }

    /**
     * Bequemlichkeitsfunktion: liefert direkt eine einzelne Form.
     * caseKey: 'Nom'|'Gen'|'Dat'|'Akk'|'Abl'   numerus: 'Sg'|'Pl'
     */
    function getForm(nounObj, caseKey, numerus) {
        const table = decline(nounObj);
        const numKey = numerus === 'Sg' ? 'sg' : 'pl';
        const cKey = { Nom: 'nom', Gen: 'gen', Dat: 'dat', Akk: 'akk', Abl: 'abl' }[caseKey];
        return table[numKey] ? table[numKey][cKey] : null;
    }

    /**
     * Liefert alle 10 Formen (5 Kasus x 2 Numeri) als flaches Array, praktisch für
     * Distraktor-Pools. Reihenfolge: [NomSg,GenSg,DatSg,AkkSg,AblSg,NomPl,GenPl,DatPl,AkkPl,AblPl]
     */
    function getAllForms(nounObj) {
        const t = decline(nounObj);
        return [
            t.sg.nom, t.sg.gen, t.sg.dat, t.sg.akk, t.sg.abl,
            t.pl.nom, t.pl.gen, t.pl.dat, t.pl.akk, t.pl.abl
        ];
    }

    return { decline, getForm, getAllForms };
})();
