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
// WELCHES Nomen dabei in Frage kommt, sagt `objArt` (Akkusativ) bzw. `datArt`
// (Dativ), und unter den Sachen noch einmal `objFeld` am Verb gegen `feld` am
// Nomen - siehe objektPool() weiter unten.
// Erlaubte Werte: "akk" | "dat" | "dat+akk" | "intrans" | "abl" | "gen",
// oder ein Array mehrerer Werte (dann wird pro Satz einer davon gewählt).

const SentenceEngine = (() => {

    // ---- Lektions-Gating (Lektionsnummern aus dem Pontes-Inhaltsverzeichnis) ----
    const ATTRIBUT_LESSON  = 6;   // L6: Genitiv als Attribut ("Wessen?")
    const ADVERBIAL_LESSON = 7;   // L7: Ablativ als adverbiale Bestimmung
    const RICHTUNG_LESSON  = 3;   // L3: Richtungsangabe, Praeposition + Akkusativ
    const DATIVOBJEKT_LESSON = 9; // L9: Dativobjekt (der Dativ selbst wird hier eingeführt)
    const PASSIV_LESSON    = 15;  // L15: Passiv
    // Das Akkusativobjekt kommt in L1 und braucht deshalb kein Gate.

    // ---- Kuratierte Wortlisten für adverbiale Bestimmungen im Ablativ ----
    // Ein zufälliges Nomen zu ziehen ergäbe oft Unsinn ("zur Zeit des Schwertes"),
    // daher pro Funktion eine handverlesene Auswahl.
    // Jeder Eintrag trägt seinen KASUS und seine Lektion. Der Kasus ist nicht
    // Zierrat: Die Richtungsangabe steht im Akkusativ, alles andere hier im
    // Ablativ - und genau dieser Unterschied ist in Lektion 7 die Lernfrage.
    //   in urbem  (Akk.) - wohin?
    //   in urbe   (Abl.) - wo?
    // Dieselbe Präposition, anderer Kasus, andere Bedeutung.
    /* Eine Richtungsangabe braucht ein Verb, das eine Bewegung bezeichnet.
       „catellae in hortum verba audiunt" ist zwar formal in Ordnung, aber
       fachlich Unsinn - niemand hört in den Garten hinein. Deshalb dieselbe
       Vorsicht wie bei den Nomenlisten oben: handverlesen statt geraten.
       venīre, currere und intrāre stehen schon in Lektion 0/1, die
       Richtungsangabe hat ab L3 also von Anfang an genug Verben. */
    const BEWEGUNGSVERBEN = [
        'īre', 'venīre', 'currere', 'fugere', 'intrāre', 'properāre', 'redīre',
        'exīre', 'adīre', 'dūcere', 'portāre', 'mittere', 'nāvigāre', 'ascendere',
        'pervenīre', 'accēdere', 'discēdere'
    ];

    /* `hinweis` sagt, WORAN man die Funktion erkennt - und das ist fast immer
       die Präposition oder ihr Fehlen. Ohne diesen Satz nennt die Rückmeldung
       nur den Fachbegriff, und der beantwortet die Frage nicht, die eine 7.
       Klasse wirklich hat: "Woran hätte ich das sehen sollen?"
       Die beiden Paare, auf die es ankommt:
         in + Akk. (wohin?)  gegen  in + Abl. (wo?)   - der Kasus entscheidet
         blosser Abl. bei einem Zeitwort (wann?)  gegen  bei einer Sache (womit?) */
    const ADVERBIALE = [
        { key: 'richtung',   kasus: 'akk', lektion: 3, prep: ['in', 'ad'], nurBewegung: true,
          woerter: ['villa', 'hortus', 'schola', 'forum', 'ātrium', 'culīna', 'peristȳlium',
                    'urbs', 'templum', 'īnsula', 'silva', 'oppidum'],
          label: 'Richtung',                                    frage: 'Wohin?',
          hinweis: '„in“ und „ad“ mit dem AKKUSATIV fragen: wohin? Dasselbe „in“ mit dem Ablativ fragt: wo? Nicht die Präposition entscheidet, sondern der Kasus.' },
        { key: 'zeit',       kasus: 'abl', lektion: 7, prep: null,
          woerter: ['hōra', 'aestās', 'nox', 'annus', 'diēs', 'lūx'],
          label: 'Zeit (Ablativus temporis)',                   frage: 'Wann?',
          hinweis: 'Bloßer Ablativ, ohne Präposition - und das Wort bezeichnet eine Zeit (hōra, nox, annus). Dann fragt er: wann?' },
        { key: 'ort',        kasus: 'abl', lektion: 7, prep: 'in',
          woerter: ['villa', 'hortus', 'schola', 'forum', 'ātrium', 'culīna', 'peristȳlium',
                    'urbs', 'templum', 'īnsula', 'silva', 'oppidum'],
          label: 'Ort (Ablativus loci)',                        frage: 'Wo?',
          hinweis: '„in“ mit dem ABLATIV fragt: wo? Mit dem Akkusativ fragt dasselbe „in“: wohin? (in urbe - in der Stadt / in urbem - in die Stadt).' },
        { key: 'herkunft',   kasus: 'abl', lektion: 7, prep: 'ex',
          woerter: ['villa', 'hortus', 'schola', 'ātrium', 'culīna',
                    'urbs', 'prōvincia', 'domus', 'silva', 'terra'],
          label: 'Herkunft/Trennung (Ablativus separationis)',  frage: 'Woher?',
          hinweis: '„ex“ steht immer mit dem Ablativ - ebenso „ab“ und „dē“. Alle drei fragen: woher?' },
        { key: 'mittel',     kasus: 'abl', lektion: 7, prep: null,
          woerter: ['pecūnia', 'tuba', 'signum', 'vōx', 'aqua', 'tabula', 'verbum',
                    'gladius', 'manus', 'nāvis', 'arma', 'dextra'],
          label: 'Mittel (Ablativus instrumenti)',              frage: 'Womit?',
          hinweis: 'Bloßer Ablativ, ohne Präposition - und das Wort bezeichnet eine Sache. Dann fragt er: womit? Bei einer Person stünde „cum“.' },
        { key: 'begleitung', kasus: 'abl', lektion: 7, prep: 'cum',
          woerter: ['amīcus', 'pater', 'māter', 'frāter', 'soror', 'servus',
                    'magister', 'discipulus', 'uxor', 'fīlius', 'fīlia'],
          label: 'Begleitung (Ablativus sociativus)',           frage: 'Mit wem?',
          hinweis: '„cum“ steht immer mit dem Ablativ und nennt die Person, die dabei ist: mit wem?' }
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

    /** Das Gegenstück: nur Sachen, mit demselben Rückfall. */
    function nurSachen(pool) {
        const gefiltert = pool.filter(n => !istBelebt(n));
        return gefiltert.length ? gefiltert : pool;
    }

    /**
     * Semantik Stufe 2, die Objektseite. Stufe 1 hat gefragt, wer HANDELN kann
     * (`subjBelebt`); hier geht es darum, was ein Verb als Objekt verträgt.
     * Ohne das griff `baueObjekt` blind in den Topf, und heraus kamen Sätze wie
     * „equī iūdicia alunt" (die Pferde nähren die Urteile) oder „aquās canis
     * accūsāverat" (der Hund beschuldigte das Wasser). Durchgesehen waren 14
     * von 32 Sätzen mit Objekt klar unmöglich.
     *
     * Die Erwartung steht als `objArt` am Verb ("belebt" | "sache"); FEHLT sie,
     * ist beides recht. Diese Richtung ist Absicht: Eine zu enge Regel nimmt
     * richtige Sätze weg, eine fehlende lässt nur den alten Zustand bestehen.
     * 54 Verben verlangen ein Lebewesen, 105 eine Sache, bei 70 ist es egal.
     *
     * Der DATIV braucht kein Feld je Verb: Ein lateinisches Dativobjekt ist
     * fast immer eine Person (alicuī). Von 30 Dativverben im Wortschatz sind es
     * drei nicht - studēre, interesse, prōvidēre -, und die tragen `datArt`.
     * Bei den 12 dat+akk-Verben greifen beide Regeln ineinander und ergeben
     * genau das Muster, das sie alle teilen: jemandem (Person) etwas (Sache).
     */
    /**
     * Semantik Stufe 2b: das Sachfeld. Jede Sache trägt `feld` (ding | ort |
     * text | zeit | stoff | abstrakt), jedes wählerische Verb `objFeld` mit
     * dem, was es verträgt. Fehlt `objFeld`, ist jedes Feld recht.
     *
     * Lebewesen kommen hier nicht vor: Ob eine Person als Objekt taugt, sagt
     * allein `objArt`. `mittere` trägt deshalb [ding, text, abstrakt] und
     * schickt trotzdem weiter Boten.
     */
    function feldPasst(nounObj, verb) {
        const felder = verb.objFeld;
        if (!felder || !felder.length) return true;
        if (istBelebt(nounObj)) return true;
        return felder.indexOf(nounObj.feld) !== -1;
    }

    function objektPool(pool, kasus, verb) {
        if (kasus === 'dat') return verb.datArt === 'sache' ? nurSachen(pool) : nurBelebte(pool);

        let raus = pool;
        if (verb.objArt === 'belebt') raus = nurBelebte(raus);
        else if (verb.objArt === 'sache') raus = nurSachen(raus);

        /* Das Sachfeld filtert OHNE Rückfall - anders als nurBelebte und
           nurSachen, die den vollen Topf zurückgeben, wenn nichts übrig
           bleibt. Hier wäre das genau der Fehler, den das Feld verhindern
           soll: Steht in der Lektionsauswahl nichts Trinkbares, lieferte der
           Rückfall wieder „urbēs bibere". Lieber kein Satz mit diesem Verb -
           baueObjekt gibt dann null, und der Aufrufer nimmt ein anderes.
           `bibere` hat im GANZEN Wortschatz nur sieben mögliche Objekte; in
           einer kleinen Lektionsauswahl sind es null, und das ist der
           Normalfall, nicht die Ausnahme. */
        if (verb.objFeld && verb.objFeld.length) raus = raus.filter(n => feldPasst(n, verb));
        return raus;
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

    /** Baut eine adverbiale Bestimmung, oder null.
     *  `maxLesson` entscheidet, welche Funktionen überhaupt in Frage kommen -
     *  die Richtungsangabe ab L3, die Ablativ-Funktionen ab L7.
     *  `nurKey` beschränkt auf eine bestimmte Funktion (für den Ablativ-Modus
     *  in ViaRomana, der gezielt kontrastieren will). */
    function baueAdverbiale(nounPool, belegt, maxLesson, nurKey, verb) {
        const frei = belegt ? nounPool.filter(n => !belegt.has(n.latin)) : nounPool;
        const bewegt = verb ? BEWEGUNGSVERBEN.indexOf(verb.latin) !== -1 : true;
        const moeglich = ADVERBIALE
            .filter(t => (maxLesson === undefined || t.lektion <= maxLesson))
            .filter(t => !t.nurBewegung || bewegt)
            .filter(t => !nurKey || t.key === nurKey)
            .map(t => ({ typ: t, treffer: t.woerter.filter(w => frei.some(n => n.latin === w)) }))
            .filter(x => x.treffer.length > 0);
        if (!moeglich.length) return null;

        const { typ, treffer } = waehle(moeglich);
        const nomen = frei.find(n => n.latin === waehle(treffer));
        if (!nomen) return null;

        const numerus = Math.random() > 0.75 ? 'pl' : 'sg';   // meist Singular, idiomatischer
        const wortform = form(nomen, typ.kasus, numerus) || form(nomen, typ.kasus, 'sg');
        if (!wortform) return null;
        if (belegt) belegt.add(nomen.latin);

        const prep = Array.isArray(typ.prep) ? waehle(typ.prep) : typ.prep;
        const text = prep ? `${prep} ${wortform}` : wortform;
        const kasusName = typ.kasus === 'akk' ? 'Akkusativ' : 'Ablativ';
        return {
            text, role: 'adv', lemma: nomen.latin, head: null,
            advKey: typ.key, advFrage: typ.frage, advKasus: typ.kasus,
            exp: `„${text}“ ist eine adverbiale Bestimmung im ${kasusName}: ${typ.label} - Frage: ${typ.frage}`
                 + (typ.hinweis ? `\n\n${typ.hinweis}` : '')
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

        /* advKey erzwingt eine bestimmte adverbiale Funktion. Gebraucht vom
           Ablativ-Modus in ViaRomana: Wuerfelt man den Satz einfach aus, kommt
           die Richtungsangabe fast nie - sie braucht ein Bewegungsverb UND muss
           sich gegen fuenf andere Funktionen durchsetzen. Gemessen 2,5 % statt
           der gewuenschten 17 %. Deshalb wird hier auch der Verbtopf passend
           eingeschraenkt, statt auf die richtige Kombination zu hoffen. */
        const advKey = opt.advKey || null;
        const advTyp = advKey ? ADVERBIALE.find(t => t.key === advKey) : null;

        const nomen = (opt.nounPool || []).filter(nomenTauglich);
        let verben = (opt.verbPool || []).filter(verbTauglich);
        if (advTyp && advTyp.nurBewegung) {
            const bewegt = verben.filter(v => BEWEGUNGSVERBEN.indexOf(v.latin) !== -1);
            if (bewegt.length) verben = bewegt;
        }
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
                ? bauePassiv(nomen, nomNomen, transitiv, passivTempora, maxLesson, darf, advKey)
                : baueAktiv(nomen, nomNomen, verben, aktivTempora, maxLesson, darf, advKey);
            if (satz) return abschliessen(satz, wortstellung);
        }

        // Letzter Ausweg: der einfachste mögliche Satz
        const einfach = baueAktiv(nomen, nomNomen, verben, ['Präsens'], maxLesson, () => false, null);
        return einfach ? abschliessen(einfach, wortstellung) : null;
    }

    function baueAktiv(nomen, nomNomen, verben, tempora, maxLesson, darf, advKey) {
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

        ergaenzeAttributOderAdverbiale(tokens, nomen, belegt, maxLesson, darf, verb, advKey);

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

    function bauePassiv(nomen, nomNomen, transitiv, tempora, maxLesson, darf, advKey) {
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
            ergaenzeAttributOderAdverbiale(tokens, nomen, belegt, maxLesson, darf, verb, advKey);
        }

        return { tokens, tempus: tLabel, genus: 'Passiv', verb };
    }

    function baueObjekt(nomen, belegt, kasus, verb) {
        const pool = objektPool(
            mitKasus(nomen, kasus).filter(n => !belegt.has(n.latin)), kasus, verb);
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
    function ergaenzeAttributOderAdverbiale(tokens, nomen, belegt, maxLesson, darf, verb, advKey) {
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

        // Frueheste adverbiale Funktion ist die Richtungsangabe (L3); welche
        // davon wirklich in Frage kommt, entscheidet baueAdverbiale selbst.
        if (darf('adv') && maxLesson >= RICHTUNG_LESSON && (advKey || Math.random() > 0.4)) {
            const adv = baueAdverbiale(nomen, belegt, maxLesson, advKey, verb);
            if (adv) tokens.push(adv);
        }
    }

    // ================= Wortstellung & Abschluss =================

    // ================= Participium coniunctum und Ablativus absolutus =================
    //
    // Der Unterschied zwischen beiden ist GENAU EINE Frage: Steht das
    // Bezugswort des Partizips im Hauptsatz oder nicht?
    //   PC:       puerum vocātum magister laudat   - "puerum" ist Objekt des Hauptsatzes
    //   Abl.abs.: urbe captā hostēs discēdunt      - "urbe" gehört zu KEINEM Satzglied
    // Im Token heisst das: partizip.head zeigt auf ein Token mit einer
    // Hauptsatz-Rolle - oder auf das eigene ablAbsSub. Daran, und nur daran,
    // unterscheidet Arcus die beiden.

    const PC_LESSON = 18;        // L18: PPP im Participium coniunctum
    /* L20, aber NICHT noch einmal hingeschrieben: Die Zahl gehört der Engine,
       die das PPA bildet. Zwei Stellen mit derselben Zahl driften auseinander -
       und hier wäre es nicht einmal aufgefallen, denn partizipVerbTauglich
       fragt ohnehin VerbEngine.isPPAKnown. Die Gegenprobe hat genau das
       gezeigt: Diese Sperre zu brechen änderte gar nichts. */
    const PC_PPA_LESSON = VerbEngine.PPA_LESSON;
    const ABL_ABS_LESSON = 22;   // L22: Ablativus absolutus
    const DEPONENS_PARTIZIP_LESSON = 31;   // L31: Partizip der Deponentien

    const PARTIZIP_ROLLEN = ['partizip', 'ablAbsSub'];

    /** Eine einzelne Partizipform, kongruent zum Bezugswort.
     *  PPP: o-/a-Deklination. PPA: dritte Deklination, einendig - dort
     *  teilen sich Maskulinum und Femininum eine Form, und im Singular gilt
     *  der Nominativ für alle drei Geschlechter. */
    function partizipForm(verb, art, kasus, numerus, genus) {
        if (art === 'ppp') return VerbEngine.getPPPForm(verb, kasus, numerus, genus);
        const d = VerbEngine.getPPADeclension(verb);
        const t = numerus === 'pl' ? d.pl : d.sg;
        if (numerus === 'pl') {
            if (kasus === 'nom') return genus === 'n' ? t.nomN : t.nomM;
            if (kasus === 'akk') return genus === 'n' ? t.akkN : t.akkM;
            return t[kasus];
        }
        if (kasus === 'nom') return t.nom;
        if (kasus === 'akk') return genus === 'n' ? t.akkN : t.akkM;
        return t[kasus];
    }

    /** Taugt dieses Verb als Partizip dieser Art in dieser Lektionsspanne? */
    function partizipVerbTauglich(verb, art, maxLesson) {
        if (!verbTauglich(verb)) return false;
        /* Deponentien tragen ihr Partizip in passiver FORM mit aktiver
           BEDEUTUNG (profectus = "aufgebrochen"). Pontes führt das eigens in
           L31 ein - vorher wäre es die eine Form, die das Falsche beibringt.
           Dieselbe Überlegung wie beim Passiv-Modus im Kastell. */
        if (istDeponens(verb) && maxLesson < DEPONENS_PARTIZIP_LESSON) return false;
        if (art === 'ppp') return VerbEngine.isPPPApplicable(verb);
        return VerbEngine.isPPAApplicable(verb)
            && VerbEngine.isPPAKnown(maxLesson);
    }

    /** Passt dieses Nomen als Bezugswort zu diesem Partizip?
     *
     *  Ein PPP ist PASSIV - sein Bezugswort ist das, was die Handlung
     *  ERLEIDET, also ein plausibles Objekt des Partizipverbs. Dafür gibt es
     *  die Semantik aus Stufe 2a/2b schon: objArt (belebt/Sache) und objFeld
     *  (ding/ort/text/zeit/stoff/abstrakt). Ohne das käme "hōra capta"
     *  heraus - die Form stimmt, der Satz ist Unsinn.
     *
     *  Ein PPA ist AKTIV - sein Bezugswort ist der Handelnde, also prüft es
     *  subjBelebt statt der Objektseite. */
    function bezugPasst(nomen, verb, art) {
        if (art === 'ppa') {
            return !verb.subjBelebt || istBelebt(nomen);
        }
        /* Die Erwartungen des Verbs DIREKT prüfen, nicht über objektPool.
           Der hat einen Rückfall auf den vollen Topf, wenn nichts übrig
           bleibt - und bei einem Topf aus einem einzigen Nomen feuert der
           immer, also kam alles durch. Gemessen hiess das "puella condita"
           (das gegründete Mädchen) und "sacerdōs cōnstrūctus" (der gebaute
           Priester). Genau dieser Rückfall steht in CLAUDE.md als Fallstrick;
           test-objektseite.js prüft eigens, dass er nicht der Normalfall ist. */
        if (verb.objArt === 'belebt' && !istBelebt(nomen)) return false;
        if (verb.objArt === 'sache' && istBelebt(nomen)) return false;
        if (verb.objFeld && verb.objFeld.length && !istBelebt(nomen)) {
            if (!feldPasst(nomen, verb)) return false;
        }
        return true;
    }

    /**
     * Baut ein Participium coniunctum oder einen Ablativus absolutus.
     *
     * optionen:
     *   nounPool, verbPool, maxLesson  wie bei build()
     *   variante   'pc' | 'ablabs' | null (null = auswürfeln, was erlaubt ist)
     *   art        'ppp' | 'ppa' | null (null = auswürfeln)
     *
     * Rückgabe wie build(): { tokens, tempus, genus, verbLemma, explanation,
     * variante, art } oder null.
     */
    function buildParticipium(optionen) {
        const opt = optionen || {};
        const maxLesson = opt.maxLesson != null ? opt.maxLesson : 999;
        if (maxLesson < PC_LESSON) return null;

        /* Was ist in dieser Spanne überhaupt erlaubt? */
        const vartenFrei = ['pc'];
        if (maxLesson >= ABL_ABS_LESSON) vartenFrei.push('ablabs');
        const variante = opt.variante || waehle(vartenFrei);
        if (vartenFrei.indexOf(variante) === -1) return null;

        const artenFrei = ['ppp'];
        if (maxLesson >= PC_PPA_LESSON) artenFrei.push('ppa');
        const art = opt.art || waehle(artenFrei);
        if (artenFrei.indexOf(art) === -1) return null;

        const nomen = (opt.nounPool || []).filter(nomenTauglich);
        const verben = (opt.verbPool || []).filter(verbTauglich);
        const partVerben = (opt.verbPool || []).filter(v => partizipVerbTauglich(v, art, maxLesson));
        if (nomen.length < 2 || !verben.length || !partVerben.length) return null;

        const nomNomen = mitKasus(nomen, 'nom');
        const ablNomen = mitKasus(nomen, 'abl');
        if (!nomNomen.length) return null;
        if (variante === 'ablabs' && !ablNomen.length) return null;

        const kombis = VerbEngine.getKnownCombinations(maxLesson);
        const tempora = [...new Set(kombis.filter(k => k.genus === 'Aktiv').map(k => k.tempus))];
        if (!tempora.length) return null;

        for (let versuch = 0; versuch < 30; versuch++) {
            const satz = variante === 'ablabs'
                ? baueAblAbs(nomen, nomNomen, ablNomen, verben, partVerben, tempora, maxLesson, art)
                : bauePC(nomen, nomNomen, verben, partVerben, tempora, maxLesson, art);
            if (satz) return satz;
        }
        return null;
    }

    /** Hauptsatz aus Subjekt und Prädikat - die gemeinsame Grundlage. */
    function baueHauptsatz(nomNomen, verben, tempora, belegt) {
        const verb = waehleGewichtet(verben.filter(v => !valenzen(v).some(x => x === 'akk')));
        if (!verb) return null;
        const pool = verb.subjBelebt ? nurBelebte(nomNomen) : nomNomen;
        const sub = frischesNomen(pool, belegt);
        if (!sub) return null;
        const numerus = Math.random() < 0.3 ? 'pl' : 'sg';
        const subForm = form(sub, 'nom', numerus);
        if (!subForm) return null;
        const tempus = waehle(tempora);
        let verbForm;
        try {
            const formen = VerbEngine.getFormsForTempus(verb, tempus, 'Aktiv');
            verbForm = formen[numerus === 'pl' ? 5 : 2];
        } catch (e) { return null; }
        if (!verbForm) return null;
        belegt.add(sub.latin);
        return { verb, sub, numerus, subForm, verbForm, tempus };
    }

    /** Participium coniunctum: Das Partizip hängt am SUBJEKT des Hauptsatzes.
     *  Bewusst nur am Subjekt und nicht auch am Objekt - im Nominativ ist die
     *  Kongruenz am deutlichsten zu sehen, und genau sie ist der Lerngegenstand. */
    function bauePC(nomen, nomNomen, verben, partVerben, tempora, maxLesson, art) {
        const belegt = new Set();
        const h = baueHauptsatz(nomNomen, verben, tempora, belegt);
        if (!h) return null;

        const passende = partVerben.filter(v => v.latin !== h.verb.latin && bezugPasst(h.sub, v, art));
        if (!passende.length) return null;
        const pVerb = waehleGewichtet(passende);
        const gender = NounEngine.decline(h.sub).gender;
        let pForm;
        try { pForm = partizipForm(pVerb, art, 'nom', h.numerus, gender); } catch (e) { return null; }
        if (!pForm) return null;

        const zeit = art === 'ppp' ? 'vorzeitig' : 'gleichzeitig';
        const tokens = [
            { text: h.subForm, role: 'sub', lemma: h.sub.latin, head: null,
              exp: `<strong>${h.subForm}</strong> ist das Subjekt (Nominativ).` },
            { text: pForm, role: 'partizip', lemma: pVerb.latin, head: 0,
              exp: `<strong>${pForm}</strong> ist das Partizip (${art.toUpperCase()}, ${zeit}). ` +
                   `Es kongruiert mit <strong>${h.subForm}</strong> - und weil dieses Wort ein ` +
                   `Satzglied des Hauptsatzes ist (Subjekt), liegt ein <strong>Participium ` +
                   `coniunctum</strong> vor.` },
            { text: h.verbForm, role: 'praed', lemma: h.verb.latin, head: null,
              exp: `<strong>${h.verbForm}</strong> ist das Prädikat (${h.tempus}).` }
        ];
        return {
            tokens, tempus: h.tempus, genus: 'Aktiv', verbLemma: h.verb.latin,
            variante: 'pc', art, zeit,
            explanation: `<strong>${pForm}</strong> gehört zu <strong>${h.subForm}</strong>, und ` +
                `dieses Wort ist das Subjekt des Hauptsatzes. Ein Partizip, dessen Bezugswort im ` +
                `Satz eine Rolle spielt, heisst <strong>Participium coniunctum</strong>. ` +
                `Das ${art.toUpperCase()} ist ${zeit}.`
        };
    }

    /** Ablativus absolutus: Nomen und Partizip stehen beide im Ablativ, und
     *  das Nomen gehört zu KEINEM Satzglied des Hauptsatzes. Genau das ist
     *  der Unterschied - deshalb bekommt es eine eigene Rolle. */
    function baueAblAbs(nomen, nomNomen, ablNomen, verben, partVerben, tempora, maxLesson, art) {
        const belegt = new Set();
        const h = baueHauptsatz(nomNomen, verben, tempora, belegt);
        if (!h) return null;

        const pVerb = waehleGewichtet(partVerben.filter(v => v.latin !== h.verb.latin));
        if (!pVerb) return null;

        /* Das Nomen des Abl. abs. muss zum Partizip passen - und es darf
           nicht dasselbe sein wie das Subjekt, sonst wäre es ein PC. */
        const frei = ablNomen.filter(n => !belegt.has(n.latin) && bezugPasst(n, pVerb, art));
        if (!frei.length) return null;
        const abl = waehleGewichtet(frei);
        const numerus = Math.random() < 0.3 ? 'pl' : 'sg';
        const ablForm = form(abl, 'abl', numerus);
        if (!ablForm) return null;
        const gender = NounEngine.decline(abl).gender;
        let pForm;
        try { pForm = partizipForm(pVerb, art, 'abl', numerus, gender); } catch (e) { return null; }
        if (!pForm) return null;

        const zeit = art === 'ppp' ? 'vorzeitig' : 'gleichzeitig';
        const tokens = [
            { text: ablForm, role: 'ablAbsSub', lemma: abl.latin, head: null,
              exp: `<strong>${ablForm}</strong> steht im Ablativ und ist KEIN Satzglied des ` +
                   `Hauptsatzes - es gehört zum Partizip.` },
            { text: pForm, role: 'partizip', lemma: pVerb.latin, head: 0,
              exp: `<strong>${pForm}</strong> ist das Partizip (${art.toUpperCase()}, ${zeit}) ` +
                   `und steht ebenfalls im Ablativ. Weil sein Bezugswort <strong>${ablForm}</strong> ` +
                   `im Hauptsatz keine Rolle spielt, liegt ein <strong>Ablativus absolutus</strong> vor.` },
            { text: h.subForm, role: 'sub', lemma: h.sub.latin, head: null,
              exp: `<strong>${h.subForm}</strong> ist das Subjekt des Hauptsatzes (Nominativ).` },
            { text: h.verbForm, role: 'praed', lemma: h.verb.latin, head: null,
              exp: `<strong>${h.verbForm}</strong> ist das Prädikat (${h.tempus}).` }
        ];
        return {
            tokens, tempus: h.tempus, genus: 'Aktiv', verbLemma: h.verb.latin,
            variante: 'ablabs', art, zeit,
            explanation: `<strong>${ablForm} ${pForm}</strong> stehen beide im Ablativ. ` +
                `<strong>${ablForm}</strong> ist weder Subjekt noch Objekt des Hauptsatzes - ` +
                `der Satz käme ohne die beiden aus. Das ist ein <strong>Ablativus absolutus</strong>. ` +
                `Das ${art.toUpperCase()} ist ${zeit}.`
        };
    }

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

    /* Feste Schulstellung für die Pendelmethode. Sie ist bewusst NICHT die
       klassische lateinische Wortstellung: Gependelt wird an einem festen
       Rahmen entlang - vorne das Subjekt, hinten das Prädikat, dazwischen das
       Objekt -, sonst geht der Schritt „jetzt nach hinten zum Prädikat“ ins
       Leere. Adverbiale und Handlungsträger stehen kurz vor dem Prädikat, wie
       im Lehrbuchsatz *puella rosam in hortō videt*. */
    const PENDEL_FOLGE = ['sub', 'dat', 'obj', 'abl', 'adv', 'praed'];

    /**
     * 'natural'  - lateinische Grundstellung: Prädikat ans Ende, Attribut direkt
     *              hinter sein Bezugswort, der Rest gemischt.
     * 'pendel'   - feste Reihenfolge nach PENDEL_FOLGE.
     * 'shuffled' - alles durcheinander (Via Rōmāna: gerade NICHT auf die
     *              Stellung verlassen, sondern auf die Endungen achten).
     */
    function ordne(tokens, modus) {
        if (modus === 'shuffled') return neuVerankern(mische(tokens), tokens);

        const attribute = tokens.filter(t => t.role === 'attr');
        const ohneAttribut = tokens.filter(t => t.role !== 'attr');

        let rest;
        if (modus === 'pendel') {
            rest = ohneAttribut.slice().sort(
                (a, b) => PENDEL_FOLGE.indexOf(a.role) - PENDEL_FOLGE.indexOf(b.role));
        } else {
            const praed = ohneAttribut.filter(t => t.role === 'praed');
            rest = mische(ohneAttribut.filter(t => t.role !== 'praed')).concat(praed);
        }

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

            // Zwei natürliche Stellungen, sonst lernen Schüler die Position statt der
            // Grammatik. Beide sind gutes Latein; die zweite (Kopfverb am Ende) ist
            // sogar die lateinische Grundstellung.
            //   puella videt servum venīre   |   puella servum venīre videt
            const angeordnet = Math.random() > 0.5
                ? tokens
                : [tokens[0], tokens[2], tokens[3], tokens[1]];

            return {
                tokens: neuVerankern(angeordnet, tokens),
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
        buildParticipium,
        PARTIZIP_ROLLEN,
        PC_LESSON,
        PC_PPA_LESSON,
        ABL_ABS_LESSON,
        DEPONENS_PARTIZIP_LESSON,
        ALLE_ROLLEN,
        ACI_ROLLEN,
        ACI_LESSON,
        ATTRIBUT_LESSON,
        ADVERBIAL_LESSON,
        RICHTUNG_LESSON,
        ADVERBIALE,
        BEWEGUNGSVERBEN,
        baueAdverbiale,
        DATIVOBJEKT_LESSON,
        PASSIV_LESSON,
        // für Tests und Spiele nützlich:
        valenzen,
        verbTauglich,
        nomenTauglich,
        mische
    };
})();
