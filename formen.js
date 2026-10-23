/* Der Formenkatalog: Welche Formen gibt eine Lektionsauswahl zu einem Wort her -
   und was ist jede davon?

   Die Engines rechnen (nounEngine.js dekliniert, verbEngine.js konjugiert), aber
   sie sagen nicht, WELCHE Formen eine 7. Klasse schon kennt, wie häufig eine Form
   ist und wie man sie benennt. Das stand bis Oktober 2026 in Kastell.html und
   wurde dort gebraucht; ein zweites Formenspiel hätte es abschreiben müssen.

   Jeder Eintrag ("Slot") ist:
     { form, label, weight, merkmale }
   `form`     die lateinische Form, wie sie dasteht
   `label`    wie sie heisst ("3. Person Singular, Perfekt, Passiv")
   `weight`   wie häufig sie vorkommen soll (nur bei Verben, siehe GEWICHT)
   `merkmale` die Achsen, auf denen sich zwei Formen unterscheiden:
              art, modus, tempus, genus, person, numerus, kasus

   Die `merkmale` sind der Grund, warum das ein eigenes Modul ist: An ihnen hängt,
   welche Formen einander ähnlich sehen - im Kastell für die Distraktoren, und in
   jedem Spiel, das Formen vergleichen will.

   Die Lektionsgrenzen kommen durchweg aus den Engines (getKnownCases,
   getKnownCombinations, isImperativeKnown ...) und stehen NICHT hier noch einmal.
   Zwei Stellen mit denselben Zahlen driften auseinander. */
const LudiFormen = (() => {
    'use strict';

    const PERSONEN = [
        "1. Person Singular", "2. Person Singular", "3. Person Singular",
        "1. Person Plural", "2. Person Plural", "3. Person Plural"
    ];
    const KASUS_LABELS = { Nom: 'Nominativ', Gen: 'Genitiv', Dat: 'Dativ', Akk: 'Akkusativ', Abl: 'Ablativ' };
    const KASUS_KEYS = ['Nom', 'Gen', 'Dat', 'Akk', 'Abl'];
    const KASUS_FELD = { Nom: 'nom', Gen: 'gen', Dat: 'dat', Akk: 'akk', Abl: 'abl' };

    // Die sechs Formen aus getFormsForTempus in ihre Merkmale übersetzt.
    const PERSON_NR   = ['1', '2', '3', '1', '2', '3'];
    const NUMERUS_VON = ['Singular', 'Singular', 'Singular', 'Plural', 'Plural', 'Plural'];

    /* Frequenz-Gewichtung der Verbformen: häufige Grundformen tauchen deutlich
       öfter auf als seltene/periphrastische Formen. Bezugsgröße 1 = "normal". */
    const GEWICHT = {
        hoch: 3,       // Präsens Aktiv/Passiv, Perfekt Aktiv
        mittel: 2,     // Imperfekt/Futur, Imperativ, Infinitiv Präsens, Perfekt Passiv
        niedrig: 1,    // Plusquamperfekt, PPA, Konjunktiv Präs./Impf./Perf./Plusquampf. Aktiv, Infinitiv Perfekt Aktiv
        selten: 0.5    // Konjunktiv Perfekt/Plusquamperfekt Passiv, Infinitiv Perfekt Passiv, Gerundium, Gerundivum
    };

    /** Alle Formen eines Substantivs, die bis `maxLesson` gelehrt sind. */
    function nomenSlots(nounObj, maxLesson) {
        const table = NounEngine.decline(nounObj);
        const erlaubteKasus = NounEngine.getKnownCases(maxLesson);
        const numeri = NounEngine.isPluralKnown(maxLesson) ? ['Sg', 'Pl'] : ['Sg'];
        const slots = [];
        KASUS_KEYS.forEach(c => {
            const caseKey = KASUS_FELD[c];
            if (erlaubteKasus.indexOf(caseKey) === -1) return;
            numeri.forEach(n => {
                const numKey = n === 'Sg' ? 'sg' : 'pl';
                // Defektive Nomen (vīs u.a.) liefern null - die Form gibt es dann nicht.
                const form = table[numKey] ? table[numKey][caseKey] : null;
                if (form) {
                    const numerus = n === 'Sg' ? 'Singular' : 'Plural';
                    slots.push({ form: form, label: KASUS_LABELS[c] + ' ' + numerus, merkmale: {
                        art: 'nomen', kasus: KASUS_LABELS[c], numerus
                    } });
                }
            });
        });
        return slots;
    }

    /** Alle Formen eines Verbs, die bis `maxLesson` gelehrt sind. */
    function verbSlots(verbObj, maxLesson) {
        const knownCombos = VerbEngine.getKnownCombinations(maxLesson); // [{tempus, genus}, ...]
        // L1 kennt nur die 3. Person Singular, L2 dazu die 3. Plural, ab L3
        // alle - sonst stehen Formen im Spiel, die nie drankamen.
        const bekanntePersonen = VerbEngine.getKnownPersonIndices(maxLesson);
        const knownTempora = [...new Set(knownCombos.map(c => c.tempus))];
        const passivKnown = knownCombos.some(c => c.genus === 'Passiv') && VerbEngine.isGenusApplicable(verbObj, 'Passiv');
        const showTempus = knownTempora.length > 1; // Solange nur Präsens bekannt ist, Tempus nicht extra nennen
        const slots = [];

        // --- Indikativ Aktiv/Passiv (5 Tempora) ---
        knownCombos.forEach(({ tempus, genus }) => {
            if (genus === 'Passiv' && !passivKnown) return;
            if (!VerbEngine.isGenusApplicable(verbObj, genus)) return;
            if ((tempus === 'Perfekt' || tempus === 'Plusquamperfekt') && genus === 'Aktiv' && !verbObj.perfect) return;
            if ((tempus === 'Perfekt' || tempus === 'Plusquamperfekt') && genus === 'Passiv' && !verbObj.ppp && verbObj.gram_class !== 'Deponens' && verbObj.latin !== 'fierī') return;
            let forms;
            try { forms = VerbEngine.getFormsForTempus(verbObj, tempus, genus); } catch (e) { return; }
            const tLabel = tempus === 'FuturI' ? 'Futur I' : tempus;
            const weight = (tempus === 'Präsens' || (tempus === 'Perfekt' && genus === 'Aktiv'))
                ? GEWICHT.hoch
                : (tempus === 'Plusquamperfekt') ? GEWICHT.niedrig : GEWICHT.mittel;
            forms.forEach((form, i) => {
                if (bekanntePersonen.indexOf(i) === -1) return;
                let label = PERSONEN[i];
                if (showTempus) label += ', ' + tLabel;
                if (passivKnown && genus === 'Passiv') label += ', Passiv';
                slots.push({ form, label, weight, merkmale: {
                    art: 'finit', modus: 'Indikativ', tempus, genus,
                    person: PERSON_NR[i], numerus: NUMERUS_VON[i]
                } });
            });
        });

        // --- Imperativ ---
        if (VerbEngine.isImperativeKnown(maxLesson) && VerbEngine.isImperativeApplicable(verbObj)) {
            const imp = VerbEngine.getImperative(verbObj);
            slots.push({ form: imp.sg, label: '2. Person Singular (Imperativ)', weight: GEWICHT.mittel,
                merkmale: { art: 'Imperativ', modus: 'Imperativ', tempus: 'Präsens', genus: 'Aktiv', person: '2', numerus: 'Singular' } });
            slots.push({ form: imp.pl, label: '2. Person Plural (Imperativ)', weight: GEWICHT.mittel,
                merkmale: { art: 'Imperativ', modus: 'Imperativ', tempus: 'Präsens', genus: 'Aktiv', person: '2', numerus: 'Plural' } });
        }

        // --- Infinitive (4 Kombinationen) ---
        [['Präsens', 'Aktiv', GEWICHT.mittel], ['Perfekt', 'Aktiv', GEWICHT.niedrig],
         ['Präsens', 'Passiv', GEWICHT.mittel], ['Perfekt', 'Passiv', GEWICHT.selten]].forEach(([t, g, w]) => {
            if (!VerbEngine.isInfinitiveKnown(t, g, maxLesson)) return;
            if (!VerbEngine.isInfinitiveApplicable(verbObj, t, g)) return;
            const form = VerbEngine.getInfinitive(verbObj, t, g);
            slots.push({ form, label: `Infinitiv ${t} ${g}`, weight: w, merkmale: {
                art: 'Infinitiv', modus: 'Infinitiv', tempus: t, genus: g, person: null, numerus: null
            } });
        });

        // --- PPA (vollständige Deklination) ---
        if (VerbEngine.isPPAKnown(maxLesson) && VerbEngine.isPPAApplicable(verbObj)) {
            const d = VerbEngine.getPPADeclension(verbObj);
            const ppaSlots = [
                [d.sg.nom, 'PPA Nominativ Singular'], [d.sg.gen, 'PPA Genitiv Singular'],
                [d.sg.dat, 'PPA Dativ Singular'], [d.sg.akkM, 'PPA Akkusativ Singular (m./f.)'],
                [d.sg.abl, 'PPA Ablativ Singular'], [d.pl.nomM, 'PPA Nominativ Plural (m./f.)'],
                [d.pl.gen, 'PPA Genitiv Plural'], [d.pl.dat, 'PPA Dativ Plural'],
                [d.pl.akkM, 'PPA Akkusativ Plural (m./f.)'], [d.pl.abl, 'PPA Ablativ Plural']
            ];
            ppaSlots.forEach(([form, label]) => slots.push({ form, label, weight: GEWICHT.niedrig, merkmale: {
                art: 'PPA', modus: 'PPA', tempus: null, genus: null, person: null,
                numerus: /Plural/.test(label) ? 'Plural' : 'Singular',
                kasus: (label.match(/(Nominativ|Genitiv|Dativ|Akkusativ|Ablativ)/) || [])[1] || null
            } }));
        }

        // --- Konjunktiv (4 Tempora x Aktiv/Passiv) ---
        if (VerbEngine.isKonjunktivKnown('Präsens', maxLesson) || VerbEngine.isKonjunktivKnown('Imperfekt', maxLesson)) {
            ['Präsens', 'Imperfekt', 'Perfekt', 'Plusquamperfekt'].forEach(t => {
                if (!VerbEngine.isKonjunktivKnown(t, maxLesson)) return;
                ['Aktiv', 'Passiv'].forEach(g => {
                    if (g === 'Passiv' && !passivKnown) return;
                    if (!VerbEngine.isGenusApplicable(verbObj, g)) return;
                    if ((t === 'Perfekt' || t === 'Plusquamperfekt') && g === 'Aktiv' && !verbObj.perfect) return;
                    if ((t === 'Perfekt' || t === 'Plusquamperfekt') && g === 'Passiv' && !verbObj.ppp && verbObj.gram_class !== 'Deponens' && verbObj.latin !== 'fierī') return;
                    let forms;
                    try { forms = VerbEngine.getSubjunctiveForms(verbObj, t, g); } catch (e) { return; }
                    const tLabel = t === 'FuturI' ? 'Futur I' : t;
                    const weight = (t === 'Perfekt' || t === 'Plusquamperfekt') && g === 'Passiv' ? GEWICHT.selten : GEWICHT.niedrig;
                    forms.forEach((form, i) => {
                        if (bekanntePersonen.indexOf(i) === -1) return;
                        let label = `Konjunktiv, ${PERSONEN[i]}, ${tLabel}`;
                        if (passivKnown && g === 'Passiv') label += ', Passiv';
                        slots.push({ form, label, weight, merkmale: {
                            art: 'finit', modus: 'Konjunktiv', tempus: t, genus: g,
                            person: PERSON_NR[i], numerus: NUMERUS_VON[i]
                        } });
                    });
                });
            });
        }

        // --- Gerundium / Gerundivum ---
        // Getrennt gestaffelt: Gerundium kommt in T2, das Gerundivum erst in T3.
        if (VerbEngine.isGerundiveApplicable(verbObj)) {
            if (VerbEngine.isGerundiumKnown(maxLesson)) {
                const g = VerbEngine.getGerundium(verbObj);
                [['gen', 'Genitiv'], ['dat', 'Dativ'], ['akk', 'Akkusativ'], ['abl', 'Ablativ']].forEach(([k, name]) => {
                    slots.push({ form: g[k], label: 'Gerundium ' + name, weight: GEWICHT.selten, merkmale: {
                        art: 'Gerundium', modus: 'Gerundium', tempus: null, genus: null,
                        person: null, numerus: 'Singular', kasus: name
                    } });
                });
            }

            if (VerbEngine.isGerundivumKnown(maxLesson)) {
                const gd = VerbEngine.getGerundivumDeclension(verbObj);
                [[gd.sg.nom, 'Nominativ', 'Singular'], [gd.sg.akk, 'Akkusativ', 'Singular'],
                 [gd.pl.nom, 'Nominativ', 'Plural']].forEach(([form, kasus, numerus]) => {
                    slots.push({ form, label: 'Gerundivum ' + kasus + ' ' + numerus, weight: GEWICHT.selten, merkmale: {
                        art: 'Gerundivum', modus: 'Gerundivum', tempus: null, genus: null,
                        person: null, numerus, kasus
                    } });
                });
            }
        }

        return slots;
    }

    /* Welche Formen sind echte Passivformen? Alles, was das Merkmal trägt -
       Indikativ, Konjunktiv und der Infinitiv Passiv.
       PPA, Gerundium und Gerundivum tragen `genus: null` und fallen damit von
       selbst heraus; sie sind keine Passivformen im Sinne von L15. */
    function istPassivform(slot) {
        return !!(slot.merkmale && slot.merkmale.genus === "Passiv");
    }

    /* Ein persönliches Passiv braucht ein Akkusativobjekt, das zum Subjekt
       werden kann. Die Engine BILDET zwar zu fast jedem Verb Passivformen -
       sie konjugiert, sie denkt nicht -, aber „venīmur" heisst nichts.
       Gemessen bei L15: 39 von 142 Verben im Passiv-Topf sind intransitiv
       oder stehen mit dem Dativ (venīre, currere, clāmāre, respondēre,
       placēre ...). Das wäre mehr als jede vierte Frage auf einer Form,
       die es nicht gibt.

       `valenz` ist dafür da und fachlich gegengelesen; sie ist mal ein
       String, mal ein Array (wenn beide Verwendungen gelten).

       Das unpersönliche Passiv (curritur - „man läuft") bleibt damit
       draussen. Das ist Absicht: Pontes führt in L15 das persönliche ein,
       und eine Form ohne Person passt nicht in ein Spiel, das nach Person
       und Numerus fragt. */
    function kannPersoenlichesPassiv(verbObj) {
        const val = verbObj.valenz;
        if (!val) return false;
        return (Array.isArray(val) ? val : [val])
            .some(v => String(v).indexOf('akk') !== -1);
    }

    return {
        nomenSlots, verbSlots, istPassivform, kannPersoenlichesPassiv,
        PERSONEN, KASUS_LABELS, KASUS_KEYS, GEWICHT
    };
})();

// Auch unter Node erreichbar, damit die Tests es ohne Browser prüfen können.
if (typeof module !== 'undefined' && module.exports) module.exports = LudiFormen;
