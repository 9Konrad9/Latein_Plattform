// sentenceEngine.js
// Zentrale Satzbau-Engine. Eine Ebene über NounEngine (Formen eines Nomens) und
// VerbEngine (Formen eines Verbs): baut aus lektionsgefiltertem Wortschatz einen
// vollständigen, grammatisch stimmigen Satz und liefert ihn als Tokenliste mit
// Rollen, Bezügen und Erklärungen zurück.
//
// Einbinden per <script src="sentenceEngine.js"></script> NACH nounEngine.js und verbEngine.js.
//
// Die Valenz jedes Verbs steht als Feld `valenz` in vocabulary.js und entscheidet,
// welches Objekt gebaut wird - NICHT mehr eine hartkodierte Liste im Spiel.
// Erlaubte Werte: "akk" | "dat" | "dat+akk" | "intrans" | "abl" | "gen",
// oder ein Array mehrerer Werte (dann wird pro Satz einer davon gewählt).

const SentenceEngine = (() => {

    // ---- Lektions-Gating (Lektionsnummern aus dem Pontes-Inhaltsverzeichnis) ----
    const ATTRIBUT_LESSON  = 6;   // L6: Genitiv als Attribut ("Wessen?")
    const ADVERBIAL_LESSON = 7;   // L7: Ablativ als adverbiale Bestimmung
    const DATIVOBJEKT_LESSON = 9; // L9: Dativobjekt (der Dativ selbst wird hier eingeführt)
    const PASSIV_LESSON    = 15;  // L15: Passiv
    // Das Akkusativobjekt kommt in L1 und braucht deshalb kein Gate.

    // ---- Kuratierte Wortlisten für adverbiale Bestimmungen im Ablativ ----
    // Ein zufälliges Nomen zu ziehen ergäbe oft Unsinn ("zur Zeit des Schwertes"),
    // daher pro Funktion eine handverlesene Auswahl.
    const ADVERBIALE = [
        { key: 'zeit',       prep: null,  woerter: ['hōra', 'nox', 'annus', 'diēs', 'lūx'],                     label: 'Zeit (Ablativus temporis)',                  frage: 'Wann?' },
        { key: 'ort',        prep: 'in',  woerter: ['villa', 'urbs', 'templum', 'īnsula', 'silva', 'oppidum'],  label: 'Ort (Ablativus loci)',                        frage: 'Wo?' },
        { key: 'herkunft',   prep: 'ex',  woerter: ['urbs', 'prōvincia', 'domus', 'silva', 'terra'],            label: 'Herkunft/Trennung (Ablativus separationis)',  frage: 'Woher?' },
        { key: 'mittel',     prep: null,  woerter: ['gladius', 'manus', 'nāvis', 'arma', 'dextra'],             label: 'Mittel (Ablativus instrumenti)',              frage: 'Womit?' },
        { key: 'begleitung', prep: 'cum', woerter: ['amīcus', 'pater', 'māter', 'frāter', 'soror', 'servus'],   label: 'Begleitung (Ablativus sociativus)',           frage: 'Mit wem?' }
    ];

    const ACI_LESSON = 8;         // L8: AcI als satzwertige Konstruktion

    const ALLE_ROLLEN = ['sub', 'praed', 'obj', 'dat', 'attr', 'abl', 'adv'];

    // Rollen innerhalb eines AcI. Bewusst eigene Namen: Der Subjektsakkusativ ist
    // KEIN Objekt, auch wenn er im Akkusativ steht - genau das ist die Hürde.
    const ACI_ROLLEN = ['aciSub', 'aciInf'];

    // ================= Hilfsmittel =================

    function zufall(n) { return Math.floor(Math.random() * n); }
    function waehle(arr) { return arr[zufall(arr.length)]; }

    /** Echtes Fisher-Yates. Array.sort(() => Math.random() - 0.5) ist nachweislich verzerrt. */
    function mische(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = zufall(i + 1);
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    /** Gewichtete Auswahl über das Leitner-System, falls verfügbar; sonst gleichverteilt. */
    function waehleGewichtet(arr) {
        if (typeof LudiProgress !== 'undefined' && LudiProgress.weightedPick) {
            return LudiProgress.weightedPick(arr);
        }
        return waehle(arr);
    }

    /** Liefert die möglichen Valenzen eines Verbs als Array. */
    function valenzen(verbObj) {
        const v = verbObj.valenz;
        if (!v) return ['akk'];               // Sicherheitsnetz für unvollständige Datensätze
        return Array.isArray(v) ? v : [v];
    }

    /**
     * Deponentien (und fierī) haben passive FORMEN, aber aktive BEDEUTUNG.
     * VerbEngine führt sie deshalb unter genus 'Passiv' - für eine Konjugationstabelle
     * richtig. Im Satz ist die Bedeutung maßgeblich: „hortārī“ heißt ermahnen, nicht
     * ermahnt werden, und ein echter Passivsatz mit Handlungsträger ist damit unmöglich.
     * Deshalb überall dort trennen, wo Form und Bedeutung auseinanderfallen.
     */
    function istDeponens(verbObj) {
        return verbObj.gram_class === 'Deponens' || verbObj.latin === 'fierī';
    }

    /** Darf dieses Verb überhaupt in einen generierten Satz? */
    function verbTauglich(verbObj) {
        if (verbObj.satzbau === false) return false;       // mehrteilige Lemmata (sē gerere ...)
        if (verbObj.latin.includes(' ')) return false;      // Sicherheitsnetz
        return true;
    }

    /** Darf dieses Nomen in einen generierten Satz? */
    function nomenTauglich(nounObj) {
        if (nounObj.latin.includes(' ')) return false;
        if (nounObj.middle && nounObj.middle.includes('Pl.')) return false;  // Pluralia tantum
        return true;
    }

    /**
     * Holt eine Kasusform und gibt null zurück, wenn sie fehlt (defektive Nomen wie vīs).
     * Jeder Aufrufer MUSS das Ergebnis prüfen - sonst landen null/undefined im UI.
     */
    function form(nounObj, kasus, numerus) {
        const d = NounEngine.decline(nounObj);
        const t = numerus === 'pl' ? d.pl : d.sg;
        return t[kasus] || null;
    }

    /** Nomen, die in diesem Kasus (Sg. UND Pl.) eine Form besitzen. */
    function mitKasus(pool, kasus) {
        return pool.filter(n => {
            const d = NounEngine.decline(n);
            return d.sg[kasus] && d.pl[kasus];
        });
    }

    /**
     * Bezeichnet dieses Nomen ein Lebewesen? Steht als Feld `belebt` in vocabulary.js
     * ("person" | "tier" | "sache"). Ältere Datensätze ohne das Feld gelten als belebt,
     * damit ein fehlender Eintrag den Wortschatz nicht stillschweigend halbiert.
     */
    function istBelebt(nounObj) {
        return nounObj.belebt !== 'sache';
    }

    /**
     * Schränkt einen Nomen-Pool auf Lebewesen ein. Fällt auf den vollen Pool zurück,
     * wenn keine übrig blieben - lieber ein schiefer Satz als gar keiner.
     */
    function nurBelebte(pool) {
        const gefiltert = pool.filter(istBelebt);
        return gefiltert.length ? gefiltert : pool;
    }

    /**
     * VerbEngine notiert zusammengesetzte Formen in Paradigmen-Schreibweise mit allen
     * drei Genera ("amātus/a/um est", Pl. "amātī/ae/a sunt") - in einer Konjugations-
     * tabelle richtig, weil dort kein Subjekt bekannt ist. Im Satz ist es bekannt, also
     * muss das Partizip mit ihm kongruieren. Betrifft Passiv-Perfekt/-Plusquamperfekt
     * und die Perfektformen der Deponentien.
     */
    const PARTIZIP_ENDUNG = {
        nom: { sg: { m: 'us', f: 'a',  n: 'um' }, pl: { m: 'ī',  f: 'ae', n: 'a' } },
        // Im AcI kongruiert das Partizip mit dem Subjektsakkusativ, steht also im Akkusativ.
        akk: { sg: { m: 'um', f: 'am', n: 'um' }, pl: { m: 'ōs', f: 'ās', n: 'a' } }
    };

    function kongruiere(text, gender, numerus, kasus) {
        if (!text) return text;
        const tabelle = PARTIZIP_ENDUNG[kasus || 'nom'][numerus === 'pl' ? 'pl' : 'sg'];
        const endung = tabelle[gender] || tabelle.m;
        return text.replace('us/a/um', endung).replace('ī/ae/a', endung);
    }

    // ================= Bausteine =================

    /** Baut eine adverbiale Bestimmung im Ablativ, oder null. */
    function baueAdverbiale(nounPool, belegt) {
        const frei = belegt ? nounPool.filter(n => !belegt.has(n.latin)) : nounPool;
        const moeglich = ADVERBIALE
            .map(t => ({ typ: t, treffer: t.woerter.filter(w => frei.some(n => n.latin === w)) }))
            .filter(x => x.treffer.length > 0);
        if (!moeglich.length) return null;

        const { typ, treffer } = waehle(moeglich);
        const nomen = frei.find(n => n.latin === waehle(treffer));
        if (!nomen) return null;
        if (belegt) belegt.add(nomen.latin);

        const numerus = Math.random() > 0.75 ? 'pl' : 'sg';   // meist Singular, idiomatischer
        const abl = form(nomen, 'abl', numerus) || form(nomen, 'abl', 'sg');
        if (!abl) return null;

        const text = typ.prep ? `${typ.prep} ${abl}` : abl;
        return {
            text, role: 'adv', lemma: nomen.latin, head: null,
            exp: `„${text}“ ist eine adverbiale Bestimmung im Ablativ (${typ.label}) - Frage: ${typ.frage}`
        };
    }

    /** Wählt ein Nomen, das noch nicht im Satz vorkommt. */
    function frischesNomen(pool, belegt) {
        const frei = pool.filter(n => !belegt.has(n.latin));
        if (!frei.length) return null;
        return waehleGewichtet(frei);
    }

    // ================= Satzbau =================

    /**
     * Baut einen Satz.
     *
     * optionen:
     *   nounPool, verbPool  - bereits lektionsgefilterte Wortlisten (Pflicht)
     *   maxLesson           - höchste gewählte Lektion, steuert das Gating
     *   genus               - 'Aktiv' | 'Passiv' | 'auto' (Vorgabe 'auto')
     *   allow               - erlaubte Rollen (Vorgabe: alle außer ablobj/genobj)
     *   wordOrder           - 'natural' (SOV, Attribut beim Bezugswort) | 'shuffled'
     *
     * Rückgabe: { tokens, tempus, genus, explanation } oder null, wenn nichts baubar war.
     * Jedes Token: { text, role, lemma, head, exp }; head ist der Index des Bezugsworts
     * (nur beim Genitiv-Attribut gesetzt), sonst null.
     */
    function build(optionen) {
        const opt = optionen || {};
        const maxLesson = opt.maxLesson != null ? opt.maxLesson : 999;
        const erlaubt = opt.allow || ALLE_ROLLEN;
        const wortstellung = opt.wordOrder || 'natural';
        const darf = r => erlaubt.indexOf(r) !== -1;

        const nomen = (opt.nounPool || []).filter(nomenTauglich);
        const verben = (opt.verbPool || []).filter(verbTauglich);
        if (nomen.length < 2 || !verben.length) return null;

        const nomNomen = mitKasus(nomen, 'nom');
        if (!nomNomen.length) return null;

        const kombis = VerbEngine.getKnownCombinations(maxLesson);
        const aktivTempora  = [...new Set(kombis.filter(k => k.genus === 'Aktiv').map(k => k.tempus))];
        const passivTempora = [...new Set(kombis.filter(k => k.genus === 'Passiv').map(k => k.tempus))];
        if (!aktivTempora.length) return null;

        // Passiv braucht ein transitives Verb - sonst gibt es nichts zu erleiden.
        // Deponentien scheiden aus: ihre Formen sind passiv, ihre Bedeutung ist es nicht.
        const transitiv = verben.filter(v => !istDeponens(v) && valenzen(v).some(x => x === 'akk' || x === 'dat+akk'));
        const passivMoeglich = darf('abl') && maxLesson >= PASSIV_LESSON
            && passivTempora.length > 0 && transitiv.length > 0;

        let genus = opt.genus || 'auto';
        if (genus === 'auto') genus = (passivMoeglich && Math.random() < 0.3) ? 'Passiv' : 'Aktiv';
        if (genus === 'Passiv' && !passivMoeglich) genus = 'Aktiv';

        for (let versuch = 0; versuch < 20; versuch++) {
            const satz = genus === 'Passiv'
                ? bauePassiv(nomen, nomNomen, transitiv, passivTempora, maxLesson, darf)
                : baueAktiv(nomen, nomNomen, verben, aktivTempora, maxLesson, darf);
            if (satz) return abschliessen(satz, wortstellung);
        }

        // Letzter Ausweg: der einfachste mögliche Satz
        const einfach = baueAktiv(nomen, nomNomen, verben, ['Präsens'], maxLesson, () => false);
        return einfach ? abschliessen(einfach, wortstellung) : null;
    }

    function baueAktiv(nomen, nomNomen, verben, tempora, maxLesson, darf) {
        const tempus = waehle(tempora);
        const verb = waehleGewichtet(verben);

        if ((tempus === 'Perfekt' || tempus === 'Plusquamperfekt') && !verb.perfect) return null;
        if (!VerbEngine.isGenusApplicable(verb, 'Aktiv')) return null;

        let formen;
        try { formen = VerbEngine.getFormsForTempus(verb, tempus, 'Aktiv'); } catch (e) { return null; }

        // Die meisten Verben (244 von 298) verlangen ein Lebewesen als Subjekt: eine Wunde
        // kann nichts verehren. Ohne diese Einschränkung waren 41,5 % aller erzeugten Sätze
        // semantisch unmöglich, weil nur gut ein Viertel der Nomen Lebewesen bezeichnet.
        const subPool = verb.subjBelebt ? nurBelebte(nomNomen) : nomNomen;

        const belegt = new Set();
        const subNomen = waehleGewichtet(subPool);
        belegt.add(subNomen.latin);

        const plural = Math.random() > 0.5;
        const subForm = form(subNomen, 'nom', plural ? 'pl' : 'sg');
        if (!subForm) return null;

        const tokens = [{
            text: subForm, role: 'sub', lemma: subNomen.latin, head: null,
            exp: `„${subForm}“ steht im Nominativ und bestimmt, wer oder was handelt.`
        }];

        // ---- Objekt(e) nach der Valenz des Verbs ----
        const valenz = waehle(valenzen(verb));

        // Der Dativ wird erst in L9 eingeführt. Davor bleibt ein Dativverb wie
        // respondēre im Wortschatz, baut aber kein Objekt - "puella respondet"
        // ist korrekt und verlangt nichts, was noch nicht gelehrt wurde.
        if ((valenz === 'dat' || valenz === 'dat+akk') && darf('dat') && maxLesson >= DATIVOBJEKT_LESSON) {
            const t = baueObjekt(nomen, belegt, 'dat', verb);
            if (!t) return null;
            tokens.push(t);
        }
        if ((valenz === 'akk' || valenz === 'dat+akk') && darf('obj')) {
            const t = baueObjekt(nomen, belegt, 'akk', verb);
            if (!t) return null;
            tokens.push(t);
        }
        // "abl" (carēre, ūtī) und "gen" (oblīvīscī) bauen bewusst kein Objekt:
        // Die Spiele haben dafür keine eigene Rolle, und ein Ablativobjekt als
        // "adverbiale Bestimmung" auszugeben wäre fachlich falsch.

        ergaenzeAttributOderAdverbiale(tokens, nomen, belegt, maxLesson, darf);

        // Deponentien bilden das Perfekt mit Partizip - das muss zum Subjekt passen.
        const subGenus = NounEngine.decline(subNomen).gender;
        const verbForm = kongruiere(plural ? formen[5] : formen[2], subGenus, plural ? 'pl' : 'sg');
        if (!verbForm) return null;
        const tLabel = tempus === 'FuturI' ? 'Futur I' : tempus;
        tokens.push({
            text: verbForm, role: 'praed', lemma: verb.latin, head: null,
            exp: `„${verbForm}“ ist das Prädikat (${tLabel}). Die Endung zeigt an, wer handelt und (ggf.) wann.`
        });

        return { tokens, tempus: tLabel, genus: 'Aktiv', verb };
    }

    function bauePassiv(nomen, nomNomen, transitiv, tempora, maxLesson, darf) {
        const tempus = waehle(tempora);
        const verb = waehleGewichtet(transitiv);

        if ((tempus === 'Perfekt' || tempus === 'Plusquamperfekt') && !verb.ppp) return null;
        if (!VerbEngine.isGenusApplicable(verb, 'Passiv')) return null;

        let formen;
        try { formen = VerbEngine.getFormsForTempus(verb, tempus, 'Passiv'); } catch (e) { return null; }

        const belegt = new Set();
        const subNomen = waehleGewichtet(nomNomen);
        belegt.add(subNomen.latin);

        const plural = Math.random() > 0.5;
        const subForm = form(subNomen, 'nom', plural ? 'pl' : 'sg');
        // Passiv-Perfekt/-Plusquamperfekt sind zusammengesetzt: PPP muss zum Subjekt passen.
        const subGenus = NounEngine.decline(subNomen).gender;
        const verbForm = kongruiere(plural ? formen[5] : formen[2], subGenus, plural ? 'pl' : 'sg');
        if (!subForm || !verbForm) return null;

        const tLabel = tempus === 'FuturI' ? 'Futur I' : tempus;
        const tokens = [
            {
                text: subForm, role: 'sub', lemma: subNomen.latin, head: null,
                exp: `„${subForm}“ steht im Nominativ - im Passivsatz das, was die Handlung ERLEIDET (nicht ausführt).`
            },
            {
                text: verbForm, role: 'praed', lemma: verb.latin, head: null,
                exp: `„${verbForm}“ ist das Prädikat im Passiv (${tLabel}). Erkennbar an den Passiv-Endungen (-tur, -ntur, -or ...).`
            }
        ];

        // Handlungsträger im Ablativ mit ā/ab. Wer eine Handlung ausführt, ist ein
        // Lebewesen - eine sachliche Ursache stünde ohne Präposition im blanken Ablativ.
        if (Math.random() > 0.4) {
            const kandidaten = nurBelebte(mitKasus(nomen, 'abl')).filter(n => !belegt.has(n.latin));
            if (kandidaten.length) {
                const agens = waehleGewichtet(kandidaten);
                belegt.add(agens.latin);
                const abl = form(agens, 'abl', Math.random() > 0.5 ? 'pl' : 'sg');
                if (abl) {
                    const prep = /^[aeiouāēīōūAEIOUĀĒĪŌŪ]/.test(abl) ? 'ab' : 'ā';
                    tokens.push({
                        text: `${prep} ${abl}`, role: 'abl', lemma: agens.latin, head: null,
                        exp: `„${prep} ${abl}“ ist der Handlungsträger (Ablativ mit ā/ab) - von wem die Handlung ausgeht.`
                    });
                }
            }
        } else {
            ergaenzeAttributOderAdverbiale(tokens, nomen, belegt, maxLesson, darf);
        }

        return { tokens, tempus: tLabel, genus: 'Passiv', verb };
    }

    function baueObjekt(nomen, belegt, kasus, verb) {
        const pool = mitKasus(nomen, kasus).filter(n => !belegt.has(n.latin));
        if (!pool.length) return null;
        const n = waehleGewichtet(pool);
        belegt.add(n.latin);

        const numerus = Math.random() > 0.5 ? 'pl' : 'sg';
        const text = form(n, kasus, numerus);
        if (!text) return null;

        const exp = kasus === 'dat'
            ? `„${text}“ steht im Dativ (Wem?) - „${verb.latin}“ verlangt ein Dativobjekt.`
            : `„${text}“ steht im Akkusativ (Wen oder was?) - es ist das direkte Ziel der Handlung.`;

        return { text, role: kasus === 'dat' ? 'dat' : 'obj', lemma: n.latin, head: null, exp };
    }

    /**
     * Hängt entweder ein Genitiv-Attribut an ein bereits vorhandenes Nomen
     * oder eine adverbiale Bestimmung an. Das Attribut bekommt über `head`
     * sein Bezugswort - ein Attribut ohne Bezugswort wäre keines.
     */
    function ergaenzeAttributOderAdverbiale(tokens, nomen, belegt, maxLesson, darf) {
        const bezugsfaehig = tokens
            .map((t, i) => ({ t, i }))
            .filter(x => x.t.role === 'sub' || x.t.role === 'obj' || x.t.role === 'dat');

        if (darf('attr') && maxLesson >= ATTRIBUT_LESSON && bezugsfaehig.length && Math.random() > 0.5) {
            const pool = mitKasus(nomen, 'gen').filter(n => !belegt.has(n.latin));
            if (pool.length) {
                const n = waehleGewichtet(pool);
                belegt.add(n.latin);
                const text = form(n, 'gen', Math.random() > 0.5 ? 'pl' : 'sg');
                if (text) {
                    const bezug = waehle(bezugsfaehig);
                    tokens.push({
                        text, role: 'attr', lemma: n.latin, head: bezug.i,
                        exp: `„${text}“ steht im Genitiv (wessen?) und ist Attribut zu „${bezug.t.text}“ - es bestimmt dieses Wort näher.`
                    });
                    return;
                }
            }
        }

        if (darf('adv') && maxLesson >= ADVERBIAL_LESSON && Math.random() > 0.4) {
            const adv = baueAdverbiale(nomen, belegt);
            if (adv) tokens.push(adv);
        }
    }

    // ================= Wortstellung & Abschluss =================

    function abschliessen(satz, wortstellung) {
        const tokens = ordne(satz.tokens, wortstellung);
        return {
            tokens,
            tempus: satz.tempus,
            genus: satz.genus,
            verbLemma: satz.verb.latin,
            explanation: gesamterklaerung(tokens, satz)
        };
    }

    /**
     * 'natural'  - lateinische Grundstellung: Prädikat ans Ende, Attribut direkt
     *              hinter sein Bezugswort, der Rest gemischt.
     * 'shuffled' - alles durcheinander (Pendelmethode: gerade NICHT auf die
     *              Stellung verlassen, sondern auf die Endungen achten).
     */
    function ordne(tokens, modus) {
        if (modus === 'shuffled') return neuVerankern(mische(tokens), tokens);

        const praed = tokens.filter(t => t.role === 'praed');
        const attribute = tokens.filter(t => t.role === 'attr');
        const rest = mische(tokens.filter(t => t.role !== 'praed' && t.role !== 'attr'));

        const ergebnis = [];
        rest.forEach(t => {
            ergebnis.push(t);
            // Attribut direkt hinter sein Bezugswort
            attribute.forEach(a => {
                if (tokens[a.head] === t) ergebnis.push(a);
            });
        });
        // Attribute ohne auffindbaren Bezug (sollte nicht vorkommen) hinten anhängen
        attribute.forEach(a => { if (ergebnis.indexOf(a) === -1) ergebnis.push(a); });
        praed.forEach(p => ergebnis.push(p));

        return neuVerankern(ergebnis, tokens);
    }

    /** Nach dem Umsortieren zeigen die head-Indizes noch auf die alten Positionen. */
    function neuVerankern(neu, alt) {
        return neu.map(t => {
            if (t.head == null) return t;
            const bezug = alt[t.head];
            const idx = neu.indexOf(bezug);
            return Object.assign({}, t, { head: idx === -1 ? null : idx });
        });
    }

    function gesamterklaerung(tokens, satz) {
        const finde = r => tokens.find(t => t.role === r);
        const sub = finde('sub'), praed = finde('praed');
        let text = `<strong>${sub.text}</strong> ist das Subjekt (Nominativ), <strong>${praed.text}</strong> das Prädikat (${satz.tempus}${satz.genus === 'Passiv' ? ' Passiv' : ''}).`;

        const obj = finde('obj'), dat = finde('dat');
        if (dat) text += ` <strong>${dat.text}</strong> ist das Dativobjekt.`;
        if (obj) text += ` <strong>${obj.text}</strong> ist das Akkusativobjekt.`;

        const attr = finde('attr');
        if (attr) {
            const bezug = attr.head != null ? tokens[attr.head] : null;
            text += ` <strong>${attr.text}</strong> ist Genitiv-Attribut${bezug ? ` zu „${bezug.text}“` : ''}.`;
        }

        const abl = finde('abl');
        if (abl) text += ` <strong>${abl.text}</strong> nennt den Handlungsträger.`;

        if (finde('adv')) text += ` Dazu kommt eine adverbiale Bestimmung im Ablativ.`;

        return text;
    }

    // ================= AcI =================

    /**
     * Baut einen Satz mit AcI: Kopfsatz (Subjekt + Kopfverb) plus eingebetteter
     * Akkusativ + Infinitiv.
     *
     *   „puella videt servum venīre.“   Subjekt puella, Kopfverb videt,
     *                                    Subjektsakkusativ servum, Infinitiv venīre.
     *
     * Das Zeitverhältnis steckt in der Infinitiv-Form: Präsens = gleichzeitig,
     * Perfekt = vorzeitig. Beides wird vom Lehrgang gestaffelt (Infinitiv Perfekt
     * Aktiv ab L10) - die Aufgabe „gleichzeitig oder vorzeitig?“ schaltet sich damit
     * genau dann frei, wenn das Lehrbuch die Zeitverhältnisse im AcI behandelt.
     *
     * Rückgabe wie build(), zusätzlich: zeitverhaeltnis ('gleichzeitig'|'vorzeitig'),
     * infGenus ('Aktiv'|'Passiv'), kopfLemma.
     */
    function buildAcI(optionen) {
        const opt = optionen || {};
        const maxLesson = opt.maxLesson != null ? opt.maxLesson : 999;
        if (maxLesson < ACI_LESSON) return null;

        const nomen = (opt.nounPool || []).filter(nomenTauglich);
        const verben = (opt.verbPool || []).filter(verbTauglich);
        const koepfe = verben.filter(v => v.aci);
        if (nomen.length < 2 || !koepfe.length || !verben.length) return null;

        const nomNomen = mitKasus(nomen, 'nom');
        const akkNomen = mitKasus(nomen, 'akk');
        if (!nomNomen.length || !akkNomen.length) return null;

        // Welche Infinitive sind in dieser Lektionsspanne bekannt?
        const inf = [];
        [['Präsens', 'Aktiv'], ['Perfekt', 'Aktiv'], ['Präsens', 'Passiv'], ['Perfekt', 'Passiv']]
            .forEach(k => { if (VerbEngine.isInfinitiveKnown(k[0], k[1], maxLesson)) inf.push({ tempus: k[0], genus: k[1] }); });
        if (!inf.length) return null;

        for (let versuch = 0; versuch < 25; versuch++) {
            const kopf = waehleGewichtet(koepfe);
            const wahl = waehle(inf);
            const innen = waehleGewichtet(verben);

            // wahl.genus ist die BEDEUTUNG. Ein Deponens trägt sie in passiver Form,
            // hat aber selbst kein Passiv - es kann also nur die aktive Lesart liefern.
            if (istDeponens(innen) && wahl.genus === 'Passiv') continue;
            const formGenus = istDeponens(innen) ? 'Passiv' : wahl.genus;

            // Passivische Bedeutung braucht ein transitives Verb - sonst gibt es nichts zu erleiden.
            if (wahl.genus === 'Passiv' && !valenzen(innen).some(x => x === 'akk' || x === 'dat+akk')) continue;
            if (!VerbEngine.isInfinitiveApplicable(innen, wahl.tempus, formGenus)) continue;

            let infForm;
            try { infForm = VerbEngine.getInfinitive(innen, wahl.tempus, formGenus); } catch (e) { continue; }
            if (!infForm) continue;

            // Kopfsatz. Sagen, denken und befehlen kann nur ein Mensch - ein Tier nicht
            // ("bōs iubet"). Sehen und hören dagegen schon, deshalb tragen die
            // Wahrnehmungsverben aci: "wahrnehmen" und lassen auch Tiere zu.
            const kopfPool = kopf.aci === 'wahrnehmen'
                ? nurBelebte(nomNomen)
                : nomNomen.filter(n => n.belebt === 'person');
            if (!kopfPool.length) continue;
            const kopfSub = waehleGewichtet(kopfPool);
            const belegt = new Set([kopfSub.latin]);
            const kopfPlural = Math.random() > 0.5;
            const kopfSubForm = form(kopfSub, 'nom', kopfPlural ? 'pl' : 'sg');

            let kopfFormen;
            try { kopfFormen = VerbEngine.getFormsForTempus(kopf, 'Präsens', 'Aktiv'); } catch (e) { continue; }
            const kopfForm = kopfPlural ? kopfFormen[5] : kopfFormen[2];
            if (!kopfSubForm || !kopfForm) continue;

            // Subjektsakkusativ: logisches Subjekt des Infinitivs. Im Aktiv gilt für ihn
            // derselbe Belebtheitsanspruch wie für jedes Subjekt; im Passiv erleidet er.
            const akkPool = (wahl.genus === 'Aktiv' && innen.subjBelebt ? nurBelebte(akkNomen) : akkNomen)
                .filter(n => !belegt.has(n.latin));
            if (!akkPool.length) continue;
            const akkNomenWahl = waehleGewichtet(akkPool);
            const akkNumerus = Math.random() > 0.5 ? 'pl' : 'sg';
            const akkForm = form(akkNomenWahl, 'akk', akkNumerus);
            if (!akkForm) continue;

            // Zusammengesetzte Infinitive (Perfekt Passiv, Deponentien) enthalten ein
            // Partizip. Es kongruiert mit dem Subjektsakkusativ - also Akkusativ,
            // nicht Nominativ: "servum missum esse", "puellās missās esse".
            const akkGenus = NounEngine.decline(akkNomenWahl).gender;
            infForm = kongruiere(infForm, akkGenus, akkNumerus, 'akk');

            const zeit = wahl.tempus === 'Präsens' ? 'gleichzeitig' : 'vorzeitig';
            const genusText = wahl.genus === 'Passiv' ? ' Passiv' : '';

            const tokens = [
                {
                    text: kopfSubForm, role: 'sub', lemma: kopfSub.latin, head: null,
                    exp: `„${kopfSubForm}“ ist das Subjekt des Hauptsatzes - wer wahrnimmt, sagt oder denkt.`
                },
                {
                    text: kopfForm, role: 'praed', lemma: kopf.latin, head: null,
                    exp: `„${kopfForm}“ ist das Prädikat des Hauptsatzes. Verben des Sagens, Denkens und Wahrnehmens lösen einen AcI aus.`
                },
                {
                    text: akkForm, role: 'aciSub', lemma: akkNomenWahl.latin, head: 3,
                    exp: `„${akkForm}“ steht im Akkusativ, ist aber KEIN Objekt: Es ist das Subjekt des AcI - im Deutschen wird es zum Subjekt des „dass“-Satzes.`
                },
                {
                    text: infForm, role: 'aciInf', lemma: innen.latin, head: 2,
                    exp: `„${infForm}“ ist der Infinitiv${genusText} des AcI (${wahl.tempus}) und damit ${zeit} zum Prädikat des Hauptsatzes.`
                }
            ];

            return {
                tokens,
                tempus: 'Präsens',
                genus: 'Aktiv',
                verbLemma: kopf.latin,
                kopfLemma: kopf.latin,
                infLemma: innen.latin,
                zeitverhaeltnis: zeit,
                infTempus: wahl.tempus,
                infGenus: wahl.genus,
                explanation: `<strong>${kopfSubForm} ${kopfForm}</strong> ist der Hauptsatz. ` +
                    `<strong>${akkForm}</strong> und <strong>${infForm}</strong> bilden den AcI: ` +
                    `„…, dass ${akkForm} ${infForm}“. Der Infinitiv steht im ${wahl.tempus}${genusText}, ` +
                    `die Handlung ist also <strong>${zeit}</strong>.`
            };
        }

        return null;
    }

    return {
        build,
        buildAcI,
        ALLE_ROLLEN,
        ACI_ROLLEN,
        ACI_LESSON,
        ATTRIBUT_LESSON,
        ADVERBIAL_LESSON,
        DATIVOBJEKT_LESSON,
        PASSIV_LESSON,
        // für Tests und Spiele nützlich:
        valenzen,
        verbTauglich,
        nomenTauglich,
        mische
    };
})();
