// verbEngine.js
// Zentrale, wiederverwendbare Konjugations-Engine für Verben.
//
// AUSBAUSTAND (Schritt 1 + 1b + 2): Aktiv UND Passiv, Indikativ, für:
// - die 5 regulären Konjugationsklassen (a-, e-, i-, konsonantische, gemischte)
// - die 7 unregelmäßigen Verbfamilien (nur Aktiv - esse, posse, velle, nōlle,
//   īre+Komposita, ferre+Komposita bilden kein Passiv)
// - fierī (Präsens/Imperfekt/Futur aktiv-förmig, Perfekt/Plusquamperfekt
//   periphrastisch mit "factus" = PPP von facere)
// - Deponentien (nutzen dieselben Passiv-Endungen, aber mit aktiver Bedeutung;
//   Konjugationsmuster wird aus der Infinitiv-Endung + 1.Sg.Präs. abgeleitet)
// über alle 5 Tempora (Präsens, Imperfekt, Futur I, Perfekt, Plusquamperfekt).
//
// Perfekt/Plusquamperfekt Passiv werden bewusst VOLLSTÄNDIG mit allen drei
// Genera notiert (z.B. "amātus/a/um sum", Plural "amātī/ae/a sumus"), damit
// die KNG-Kongruenz zum Subjekt nicht aus dem Blick gerät.
//
// NICHT abgedeckt (bewusst spätere Ausbauschritte):
// - Konjunktiv, Imperativ, Gerundium/Gerundivum
//
// isSupported(verbObj) MUSS vor jedem getForm()-Aufruf geprüft werden.
// isGenusApplicable(verbObj, genus) prüft, ob ein Genus verbi für dieses Verb
// überhaupt sinnvoll ist (z.B. Passiv bei posse NICHT, Aktiv bei Deponentien NICHT).
// getFormsForTempus(verbObj, tempus, genus) - genus: 'Aktiv' (Standard) | 'Passiv'.
//
// Einbinden per <script src="verbEngine.js"></script> NACH vocabulary.js.

const VerbEngine = (() => {

    // Ab welcher Lektion ein Tempus/Genus grundsätzlich als bekannt gilt (unabhängig
    // davon, wann das einzelne Wort selbst eingeführt wurde). Präsens Aktiv braucht
    // keinen Eintrag, da es automatisch verfügbar ist, sobald das Wort im Pool ist.
    const TEMPUS_LESSON_AKTIV = {
        'Perfekt': 10,
        'Imperfekt': 12,
        'FuturI': 13,
        'Plusquamperfekt': 14
    };

    // Passiv wird komplett ab Lektion 15 (Präsensstamm-Zeiten) bzw. 16 (Perfektsystem,
    // da dort das PPP eingeführt wird) bekannt.
    const TEMPUS_LESSON_PASSIV = {
        'Präsens': 15,
        'Imperfekt': 15,
        'FuturI': 15,
        'Perfekt': 16,
        'Plusquamperfekt': 16
    };

    const TEMPORA = ['Präsens', 'Imperfekt', 'FuturI', 'Perfekt', 'Plusquamperfekt'];
    const GENERA = ['Aktiv', 'Passiv'];

    /**
     * Prüft, ob ein Verb von dieser Engine abgedeckt wird.
     */
    function isSupported(verbObj) {
        return verbObj.type === 'verb';
    }

    /**
     * Prüft, ob für dieses Verb das angegebene Genus verbi überhaupt sinnvoll ist.
     * Deponentien und fierī haben nur EIN sinnvolles Genus (Passiv-Form, siehe unten) -
     * "Aktiv" bei ihnen anzufragen ergibt grammatisch keinen Sinn.
     * Die 6 "reinen" unregelmäßigen Verbfamilien (esse, posse, velle, nōlle,
     * īre-Komposita, ferre-Komposita) bilden kein Passiv.
     */
    function isGenusApplicable(verbObj, genus) {
        if (verbObj.gram_class === 'Deponens' || verbObj.latin === 'fierī') {
            return genus === 'Passiv';
        }
        if (genus === 'Aktiv') return true;
        return verbObj.gram_class !== 'unregelmäßiges Verb';
    }

    /**
     * Prüft, ob ein bestimmtes Tempus (in einem bestimmten Genus) für die gewählte
     * Lektionsauswahl bereits bekannt ist.
     */
    function isTempusKnown(tempus, maxSelectedLesson, genus) {
        genus = genus || 'Aktiv';
        if (genus === 'Aktiv') {
            if (tempus === 'Präsens') return true;
            const at = TEMPUS_LESSON_AKTIV[tempus];
            return at !== undefined && maxSelectedLesson >= at;
        }
        const at = TEMPUS_LESSON_PASSIV[tempus];
        return at !== undefined && maxSelectedLesson >= at;
    }

    /**
     * Liefert die Liste der (Tempus, Genus)-Kombinationen, die für die gegebene
     * Lektionsauswahl bereits bekannt sind, als Array von {tempus, genus}.
     */
    function getKnownCombinations(maxSelectedLesson) {
        const result = [];
        GENERA.forEach(genus => {
            TEMPORA.forEach(tempus => {
                if (isTempusKnown(tempus, maxSelectedLesson, genus)) {
                    result.push({ tempus, genus });
                }
            });
        });
        return result;
    }

    /** Rückwärtskompatibel: nur Aktiv-Tempora (wie vor dem Passiv-Ausbau). */
    function getKnownTempora(maxSelectedLesson) {
        return TEMPORA.filter(t => isTempusKnown(t, maxSelectedLesson, 'Aktiv'));
    }

    function getPresentStem(verbObj) {
        return verbObj.latin.slice(0, -3); // āre/ēre/īre/ere sind immer 3 Zeichen lang
    }

    function getPerfectStem(verbObj) {
        return verbObj.perfect.slice(0, -1); // 1. Pers. Sg. Perfekt endet immer auf "ī"
    }

    // ============================================================
    // AKTIV, REGULÄRE KONJUGATIONSKLASSEN
    // ============================================================

    function presentActive(verbObj) {
        // dare: einzige a-Konjugation mit KURZEM a in fast allen Formen (dās behält als
        // einzige Form die Länge - eine klassische, oft eigens hervorgehobene Ausnahme).
        if (verbObj.latin === 'dare') return ['dō', 'dās', 'dat', 'damus', 'datis', 'dant'];
        const stem = getPresentStem(verbObj);
        const gc = verbObj.gram_class;
        if (gc.includes('a-Konjugation')) return [stem + 'ō', stem + 'ās', stem + 'at', stem + 'āmus', stem + 'ātis', stem + 'ant'];
        if (gc.includes('e-Konjugation')) return [stem + 'eō', stem + 'ēs', stem + 'et', stem + 'ēmus', stem + 'ētis', stem + 'ent'];
        if (gc.includes('i-Konjugation')) return [stem + 'iō', stem + 'īs', stem + 'it', stem + 'īmus', stem + 'ītis', stem + 'iunt'];
        if (gc.includes('gemischte')) return [stem + 'iō', stem + 'is', stem + 'it', stem + 'imus', stem + 'itis', stem + 'iunt'];
        return [stem + 'ō', stem + 'is', stem + 'it', stem + 'imus', stem + 'itis', stem + 'unt']; // konsonantische
    }

    function imperfectActive(verbObj) {
        if (verbObj.latin === 'dare') return ['dabam', 'dabās', 'dabat', 'dabāmus', 'dabātis', 'dabant'];
        const stem = getPresentStem(verbObj);
        const gc = verbObj.gram_class;
        if (gc.includes('a-Konjugation')) return [stem + 'ābam', stem + 'ābās', stem + 'ābat', stem + 'ābāmus', stem + 'ābātis', stem + 'ābant'];
        if (gc.includes('i-Konjugation') || gc.includes('gemischte')) return [stem + 'iēbam', stem + 'iēbās', stem + 'iēbat', stem + 'iēbāmus', stem + 'iēbātis', stem + 'iēbant'];
        return [stem + 'ēbam', stem + 'ēbās', stem + 'ēbat', stem + 'ēbāmus', stem + 'ēbātis', stem + 'ēbant']; // e-/konsonantische
    }

    function futureIActive(verbObj) {
        if (verbObj.latin === 'dare') return ['dabō', 'dabis', 'dabit', 'dabimus', 'dabitis', 'dabunt'];
        const stem = getPresentStem(verbObj);
        const gc = verbObj.gram_class;
        if (gc.includes('a-Konjugation')) return [stem + 'ābō', stem + 'ābis', stem + 'ābit', stem + 'ābimus', stem + 'ābitis', stem + 'ābunt'];
        if (gc.includes('e-Konjugation')) return [stem + 'ēbō', stem + 'ēbis', stem + 'ēbit', stem + 'ēbimus', stem + 'ēbitis', stem + 'ēbunt'];
        if (gc.includes('i-Konjugation') || gc.includes('gemischte')) return [stem + 'iam', stem + 'iēs', stem + 'iet', stem + 'iēmus', stem + 'iētis', stem + 'ient'];
        return [stem + 'am', stem + 'ēs', stem + 'et', stem + 'ēmus', stem + 'ētis', stem + 'ent']; // konsonantische
    }

    /**
     * Perfekt/Plusquamperfekt Aktiv, alle 6 Personen. Baut IMMER auf dem gespeicherten
     * Perfektstamm auf - unabhängig von Konjugationsklasse.
     */
    function perfectActive(verbObj) {
        const stem = getPerfectStem(verbObj);
        return [stem + 'ī', stem + 'istī', stem + 'it', stem + 'imus', stem + 'istis', stem + 'ērunt'];
    }

    function pluperfectActive(verbObj) {
        const stem = getPerfectStem(verbObj);
        return [stem + 'eram', stem + 'erās', stem + 'erat', stem + 'erāmus', stem + 'erātis', stem + 'erant'];
    }

    // ============================================================
    // PASSIV, REGULÄRE KONJUGATIONSKLASSEN (+ Deponentien, siehe unten)
    // ============================================================
    // Die vier "Konjugationstypen" a/e/i/kons/gemischt werden hier einheitlich
    // über einen conjType-String angesteuert, damit dieselben Funktionen sowohl
    // für reguläre Verben (aus gram_class) als auch für Deponentien (aus der
    // Infinitiv-Endung abgeleitet) genutzt werden können.

    function gramClassToConjType(gc) {
        if (gc.includes('a-Konjugation')) return 'a';
        if (gc.includes('e-Konjugation')) return 'e';
        if (gc.includes('i-Konjugation')) return 'i';
        if (gc.includes('gemischte')) return 'gemischt';
        return 'kons';
    }

    function presentPassiveByType(stem, conjType) {
        switch (conjType) {
            case 'a': return [stem + 'or', stem + 'āris', stem + 'ātur', stem + 'āmur', stem + 'āminī', stem + 'antur'];
            case 'e': return [stem + 'eor', stem + 'ēris', stem + 'ētur', stem + 'ēmur', stem + 'ēminī', stem + 'entur'];
            case 'i': return [stem + 'ior', stem + 'īris', stem + 'ītur', stem + 'īmur', stem + 'īminī', stem + 'iuntur'];
            case 'gemischt': return [stem + 'ior', stem + 'eris', stem + 'itur', stem + 'imur', stem + 'iminī', stem + 'iuntur'];
            default: return [stem + 'or', stem + 'eris', stem + 'itur', stem + 'imur', stem + 'iminī', stem + 'untur']; // kons
        }
    }

    function imperfectPassiveByType(stem, conjType) {
        switch (conjType) {
            case 'a': return [stem + 'ābar', stem + 'ābāris', stem + 'ābātur', stem + 'ābāmur', stem + 'ābāminī', stem + 'ābantur'];
            case 'i': case 'gemischt': return [stem + 'iēbar', stem + 'iēbāris', stem + 'iēbātur', stem + 'iēbāmur', stem + 'iēbāminī', stem + 'iēbantur'];
            default: return [stem + 'ēbar', stem + 'ēbāris', stem + 'ēbātur', stem + 'ēbāmur', stem + 'ēbāminī', stem + 'ēbantur']; // e/kons
        }
    }

    function futureIPassiveByType(stem, conjType) {
        switch (conjType) {
            case 'a': return [stem + 'ābor', stem + 'āberis', stem + 'ābitur', stem + 'ābimur', stem + 'ābiminī', stem + 'ābuntur'];
            case 'e': return [stem + 'ēbor', stem + 'ēberis', stem + 'ēbitur', stem + 'ēbimur', stem + 'ēbiminī', stem + 'ēbuntur'];
            case 'i': case 'gemischt': return [stem + 'iar', stem + 'iēris', stem + 'iētur', stem + 'iēmur', stem + 'iēminī', stem + 'ientur'];
            default: return [stem + 'ar', stem + 'ēris', stem + 'ētur', stem + 'ēmur', stem + 'ēminī', stem + 'entur']; // kons
        }
    }

    function presentPassive(verbObj) {
        return presentPassiveByType(getPresentStem(verbObj), gramClassToConjType(verbObj.gram_class));
    }
    function imperfectPassive(verbObj) {
        return imperfectPassiveByType(getPresentStem(verbObj), gramClassToConjType(verbObj.gram_class));
    }
    function futureIPassive(verbObj) {
        return futureIPassiveByType(getPresentStem(verbObj), gramClassToConjType(verbObj.gram_class));
    }

    /**
     * Leitet aus einem PPP (immer Neutrum Sg. auf "-um", z.B. "amātum") den
     * reinen Adjektivstamm ab (z.B. "amāt").
     */
    function adjStemFromPPP(ppp) {
        return ppp.slice(0, -2);
    }

    /**
     * Leitet aus einem als "STAMMus sum" gespeicherten Perfekt (Deponentien, fierī)
     * den reinen Adjektivstamm ab (z.B. "hortātus sum" -> "hortāt", "factus sum" -> "fact").
     */
    function adjStemFromDeponentPerfect(perfect) {
        return perfect.replace(/us sum$/, '');
    }

    /**
     * Perfekt Passiv: vollständige KNG-Notation, z.B.
     * ["amātus/a/um sum", "amātus/a/um es", "amātus/a/um est",
     *  "amātī/ae/a sumus", "amātī/ae/a estis", "amātī/ae/a sunt"]
     */
    function perfectPassiveFromStem(adjStem) {
        const sg = adjStem + 'us/a/um';
        const pl = adjStem + 'ī/ae/a';
        const esseP = ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'];
        return [sg + ' ' + esseP[0], sg + ' ' + esseP[1], sg + ' ' + esseP[2], pl + ' ' + esseP[3], pl + ' ' + esseP[4], pl + ' ' + esseP[5]];
    }

    function pluperfectPassiveFromStem(adjStem) {
        const sg = adjStem + 'us/a/um';
        const pl = adjStem + 'ī/ae/a';
        const esseI = ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant'];
        return [sg + ' ' + esseI[0], sg + ' ' + esseI[1], sg + ' ' + esseI[2], pl + ' ' + esseI[3], pl + ' ' + esseI[4], pl + ' ' + esseI[5]];
    }

    function perfectPassive(verbObj) {
        if (!verbObj.ppp) throw new Error(`VerbEngine: Kein PPP für "${verbObj.latin}" hinterlegt, Perfekt Passiv nicht bildbar.`);
        return perfectPassiveFromStem(adjStemFromPPP(verbObj.ppp));
    }
    function pluperfectPassive(verbObj) {
        if (!verbObj.ppp) throw new Error(`VerbEngine: Kein PPP für "${verbObj.latin}" hinterlegt, Plusquamperfekt Passiv nicht bildbar.`);
        return pluperfectPassiveFromStem(adjStemFromPPP(verbObj.ppp));
    }

    // ============================================================
    // DEPONENTIEN: Konjugationsmuster aus Infinitiv + 1.Sg.Präsens ableiten
    // ============================================================

    /**
     * Liefert { stem, conjType } für ein Deponens, abgeleitet aus der Infinitiv-
     * Endung (-ārī/-ērī/-īrī/-ī) und ggf. dem middle-Feld (zur Unterscheidung
     * zwischen konsonantischer und gemischter Konjugation bei reiner "-ī"-Endung).
     */
    function getDeponentStemAndType(verbObj) {
        const latin = verbObj.latin;
        if (latin.endsWith('ārī')) return { stem: latin.slice(0, -3), conjType: 'a' };
        if (latin.endsWith('ērī')) return { stem: latin.slice(0, -3), conjType: 'e' };
        if (latin.endsWith('īrī')) return { stem: latin.slice(0, -3), conjType: 'i' };
        // reine "-ī"-Endung: konsonantisch oder gemischt, unterschieden über middle (...or vs. ...ior)
        const stem = latin.slice(0, -1);
        const conjType = verbObj.middle.endsWith('ior') ? 'gemischt' : 'kons';
        return { stem, conjType };
    }

    function deponentForms(verbObj, tempus) {
        const { stem, conjType } = getDeponentStemAndType(verbObj);
        if (tempus === 'Präsens') return presentPassiveByType(stem, conjType);
        if (tempus === 'Imperfekt') return imperfectPassiveByType(stem, conjType);
        if (tempus === 'FuturI') return futureIPassiveByType(stem, conjType);
        if (tempus === 'Perfekt') return perfectPassiveFromStem(adjStemFromDeponentPerfect(verbObj.perfect));
        if (tempus === 'Plusquamperfekt') return pluperfectPassiveFromStem(adjStemFromDeponentPerfect(verbObj.perfect));
        return null;
    }

    // ============================================================
    // fierī: Präsens/Imperfekt/Futur aktiv-förmig, Perfekt/Plusquamperfekt
    // periphrastisch mit "factus" (PPP von facere, das fierī selbst nicht hat).
    // ============================================================

    const FIERI_TABLE = {
        'Präsens': ['fīō', 'fīs', 'fit', 'fīmus', 'fītis', 'fīunt'],
        'Imperfekt': ['fīēbam', 'fīēbās', 'fīēbat', 'fīēbāmus', 'fīēbātis', 'fīēbant'],
        'FuturI': ['fīam', 'fīēs', 'fīet', 'fīēmus', 'fīētis', 'fīent']
    };

    function fieriForms(verbObj, tempus) {
        if (FIERI_TABLE[tempus]) return FIERI_TABLE[tempus];
        if (tempus === 'Perfekt') return perfectPassiveFromStem(adjStemFromDeponentPerfect(verbObj.perfect));
        if (tempus === 'Plusquamperfekt') return pluperfectPassiveFromStem(adjStemFromDeponentPerfect(verbObj.perfect));
        return null;
    }

    // ============================================================
    // DIE 6 "REINEN" UNREGELMÄSSIGEN VERBFAMILIEN (nur Aktiv, siehe Schritt 1b)
    // ============================================================

    const BASE_TABLES = {
        esse: {
            'Präsens': ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'],
            'Imperfekt': ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant'],
            'FuturI': ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erunt'],
            'Perfekt': ['fuī', 'fuistī', 'fuit', 'fuimus', 'fuistis', 'fuērunt'],
            'Plusquamperfekt': ['fueram', 'fuerās', 'fuerat', 'fuerāmus', 'fuerātis', 'fuerant']
        },
        posse: {
            'Präsens': ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt'],
            'Imperfekt': ['poteram', 'poterās', 'poterat', 'poterāmus', 'poterātis', 'poterant'],
            'FuturI': ['poterō', 'poteris', 'poterit', 'poterimus', 'poteritis', 'poterunt'],
            'Perfekt': ['potuī', 'potuistī', 'potuit', 'potuimus', 'potuistis', 'potuērunt'],
            'Plusquamperfekt': ['potueram', 'potuerās', 'potuerat', 'potuerāmus', 'potuerātis', 'potuerant']
        },
        velle: {
            'Präsens': ['volō', 'vīs', 'vult', 'volumus', 'vultis', 'volunt'],
            'Imperfekt': ['volēbam', 'volēbās', 'volēbat', 'volēbāmus', 'volēbātis', 'volēbant'],
            'FuturI': ['volam', 'volēs', 'volet', 'volēmus', 'volētis', 'volent'],
            'Perfekt': ['voluī', 'voluistī', 'voluit', 'voluimus', 'voluistis', 'voluērunt'],
            'Plusquamperfekt': ['volueram', 'voluerās', 'voluerat', 'voluerāmus', 'voluerātis', 'voluerant']
        },
        nōlle: {
            'Präsens': ['nōlō', 'nōn vīs', 'nōn vult', 'nōlumus', 'nōn vultis', 'nōlunt'],
            'Imperfekt': ['nōlēbam', 'nōlēbās', 'nōlēbat', 'nōlēbāmus', 'nōlēbātis', 'nōlēbant'],
            'FuturI': ['nōlam', 'nōlēs', 'nōlet', 'nōlēmus', 'nōlētis', 'nōlent'],
            'Perfekt': ['nōluī', 'nōluistī', 'nōluit', 'nōluimus', 'nōluistis', 'nōluērunt'],
            'Plusquamperfekt': ['nōlueram', 'nōluerās', 'nōluerat', 'nōluerāmus', 'nōluerātis', 'nōluerant']
        }
    };

    const IRE_BASE = {
        'Präsens': ['eō', 'īs', 'it', 'īmus', 'ītis', 'eunt'],
        'Imperfekt': ['ībam', 'ībās', 'ībat', 'ībāmus', 'ībātis', 'ībant'],
        'FuturI': ['ībō', 'ībis', 'ībit', 'ībimus', 'ībitis', 'ībunt']
    };

    const FERRE_BASE = {
        'Präsens': ['ferō', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt']
    };

    /**
     * Erkennt, zu welcher der 6 "reinen" unregelmäßigen Familien ein Verb gehört.
     * WICHTIG: nur für gram_class "unregelmäßiges Verb" aufrufen - sonst würden
     * ganz normale i-Konjugation-Verben wie audīre (endet ebenfalls auf "īre")
     * fälschlich als īre-Kompositum erkannt.
     */
    function detectIrregularFamily(verbObj) {
        if (verbObj.gram_class !== 'unregelmäßiges Verb') return null;
        const latin = verbObj.latin.replace(/^sē\s+/, ''); // reflexives "sē" bei sē cōnferre entfernen

        if (latin === 'esse' || latin === 'posse' || latin === 'velle' || latin === 'nōlle') {
            return { base: latin, prefix: '' };
        }
        if (latin.endsWith('esse') && latin !== 'esse') return { base: 'esse', prefix: latin.slice(0, -4) };
        if (latin.endsWith('īre')) return { base: 'īre', prefix: latin.slice(0, -3) };
        if (latin.endsWith('ferre')) return { base: 'ferre', prefix: latin.slice(0, -5) };
        return null;
    }

    function irregularForms(verbObj, tempus) {
        const fam = detectIrregularFamily(verbObj);
        if (!fam) return null;

        if (fam.base === 'esse' || fam.base === 'posse' || fam.base === 'velle' || fam.base === 'nōlle') {
            const table = BASE_TABLES[fam.base][tempus];
            if (!table) return null;
            if (!fam.prefix) return table;
            // Perfekt/Plusquamperfekt der esse-Komposita NICHT per Präfix ableiten
            // (abesse hat die Ausnahme āfuī statt "ab"+"fuī") - stattdessen den
            // gespeicherten perfect-Wert des jeweiligen Kompositums nutzen.
            if (tempus === 'Perfekt') return perfectActive(verbObj);
            if (tempus === 'Plusquamperfekt') return pluperfectActive(verbObj);
            return table.map(f => fam.prefix + f);
        }

        if (fam.base === 'īre') {
            if (tempus === 'Perfekt') return perfectActive(verbObj);
            if (tempus === 'Plusquamperfekt') return pluperfectActive(verbObj);
            const table = IRE_BASE[tempus];
            if (!table) return null;
            return fam.prefix ? table.map(f => fam.prefix + f) : table;
        }

        if (fam.base === 'ferre') {
            if (tempus === 'Präsens') return FERRE_BASE['Präsens'].map(f => fam.prefix + f);
            const pseudoStem = fam.prefix + 'fer';
            if (tempus === 'Imperfekt') return [pseudoStem + 'ēbam', pseudoStem + 'ēbās', pseudoStem + 'ēbat', pseudoStem + 'ēbāmus', pseudoStem + 'ēbātis', pseudoStem + 'ēbant'];
            if (tempus === 'FuturI') return [pseudoStem + 'am', pseudoStem + 'ēs', pseudoStem + 'et', pseudoStem + 'ēmus', pseudoStem + 'ētis', pseudoStem + 'ent'];
            if (tempus === 'Perfekt') return perfectActive(verbObj);
            if (tempus === 'Plusquamperfekt') return pluperfectActive(verbObj);
        }
        return null;
    }

    const AKTIV_BUILDERS = {
        'Präsens': presentActive, 'Imperfekt': imperfectActive, 'FuturI': futureIActive,
        'Perfekt': perfectActive, 'Plusquamperfekt': pluperfectActive
    };
    const PASSIV_BUILDERS = {
        'Präsens': presentPassive, 'Imperfekt': imperfectPassive, 'FuturI': futureIPassive,
        'Perfekt': perfectPassive, 'Plusquamperfekt': pluperfectPassive
    };

    /**
     * Liefert alle 6 Personalformen für ein Tempus. genus: 'Aktiv' (Standard) | 'Passiv'.
     */
    function getFormsForTempus(verbObj, tempus, genus) {
        genus = genus || 'Aktiv';
        if (!isSupported(verbObj)) {
            throw new Error(`VerbEngine: "${verbObj.latin}" wird nicht unterstützt.`);
        }
        if (!isGenusApplicable(verbObj, genus)) {
            throw new Error(`VerbEngine: "${verbObj.latin}" bildet kein ${genus}.`);
        }

        if (verbObj.gram_class === 'Deponens') return deponentForms(verbObj, tempus);
        if (verbObj.latin === 'fierī') return fieriForms(verbObj, tempus);

        if (genus === 'Aktiv') {
            const irregular = irregularForms(verbObj, tempus);
            if (irregular) return irregular;
            if ((tempus === 'Perfekt' || tempus === 'Plusquamperfekt') && !verbObj.perfect) {
                throw new Error(`VerbEngine: Kein Perfektstamm für "${verbObj.latin}" hinterlegt.`);
            }
            const builder = AKTIV_BUILDERS[tempus];
            if (!builder) throw new Error(`VerbEngine: Unbekanntes Tempus "${tempus}".`);
            return builder(verbObj);
        }

        // Passiv (nur reguläre Konjugationsklassen, s. isGenusApplicable)
        const builder = PASSIV_BUILDERS[tempus];
        if (!builder) throw new Error(`VerbEngine: Unbekanntes Tempus "${tempus}".`);
        return builder(verbObj);
    }

    /** Bequemlichkeitsfunktion: liefert eine einzelne Form (0=1.Sg ... 5=3.Pl). */
    function getForm(verbObj, tempus, personIdx, genus) {
        return getFormsForTempus(verbObj, tempus, genus)[personIdx];
    }

    // ============================================================
    // IMPERATIV PRÄSENS (2. Sg. und 2. Pl.) - eigene, kleinere Formen-Menge,
    // deshalb bewusst getrennt von getFormsForTempus() statt diese zu überladen.
    // ============================================================

    // Ab welcher Lektion der Imperativ grundsätzlich bekannt ist.
    const IMPERATIV_LESSON = 4;

    // Lexikalisierte Kurzformen (Sg.) bei sonst regulären konsonantischen/
    // gemischten Verben - der Plural bleibt jeweils regulär.
    const SHORT_IMPERATIVE_SG = { 'dūcere': 'dūc', 'dīcere': 'dīc', 'facere': 'fac' };

    /**
     * Prüft, ob für dieses Verb ein Imperativ sinnvoll gebildet werden kann.
     * posse und velle bilden traditionell keinen Imperativ.
     */
    function isImperativeApplicable(verbObj) {
        if (verbObj.type !== 'verb') return false;
        if (verbObj.latin === 'posse' || verbObj.latin === 'velle') return false;
        return true;
    }

    function isImperativeKnown(maxSelectedLesson) {
        return maxSelectedLesson >= IMPERATIV_LESSON;
    }

    /**
     * Liefert den Imperativ Präsens als { sg, pl }. Deckt reguläre Klassen
     * (inkl. der 3 lexikalisierten Kurzformen dūc/dīc/fac), Deponentien,
     * fierī sowie die unregelmäßigen Familien (außer posse/velle) ab.
     */
    function getImperative(verbObj) {
        if (!isImperativeApplicable(verbObj)) {
            throw new Error(`VerbEngine: "${verbObj.latin}" bildet keinen Imperativ.`);
        }

        // Deponentien: Sg. = Infinitiv mit "ī" -> "e" (ārī/ērī/īrī) bzw. Stamm+ere (bloßes ī);
        // Pl. = 2. Pl. Präsens Passiv (identische Form).
        if (verbObj.gram_class === 'Deponens') {
            const { stem, conjType } = getDeponentStemAndType(verbObj);
            const pl = presentPassiveByType(stem, conjType)[4];
            const sg = (conjType === 'kons' || conjType === 'gemischt')
                ? stem + 'ere'
                : verbObj.latin.slice(0, -1) + 'e';
            return { sg, pl };
        }

        // fierī: folgt derselben Logik wie īre (bloßer Präsensstamm "fī-" + kurzer Vokal)
        if (verbObj.latin === 'fierī') return { sg: 'fī', pl: 'fīte' };

        // Die 6 "reinen" unregelmäßigen Familien
        const fam = detectIrregularFamily(verbObj);
        if (fam) {
            if (fam.base === 'esse') return { sg: fam.prefix + 'es', pl: fam.prefix + 'este' };
            if (fam.base === 'nōlle') return { sg: fam.prefix + 'nōlī', pl: fam.prefix + 'nōlīte' };
            if (fam.base === 'īre') return { sg: fam.prefix + 'ī', pl: fam.prefix + 'īte' };
            if (fam.base === 'ferre') return { sg: fam.prefix + 'fer', pl: fam.prefix + 'ferte' };
        }

        // Reguläre Konjugationsklassen
        if (SHORT_IMPERATIVE_SG[verbObj.latin]) {
            const stem = getPresentStem(verbObj);
            return { sg: SHORT_IMPERATIVE_SG[verbObj.latin], pl: stem + 'ite' };
        }
        const stem = getPresentStem(verbObj);
        const gc = verbObj.gram_class;
        if (gc.includes('a-Konjugation')) return { sg: stem + 'ā', pl: stem + 'āte' };
        if (gc.includes('e-Konjugation')) return { sg: stem + 'ē', pl: stem + 'ēte' };
        if (gc.includes('i-Konjugation')) return { sg: stem + 'ī', pl: stem + 'īte' };
        return { sg: stem + 'e', pl: stem + 'ite' }; // konsonantische/gemischte
    }

    // ============================================================
    // INFINITIVE (Präsens/Perfekt x Aktiv/Passiv)
    // ============================================================
    // Infinitiv Präsens Aktiv ist bei regulären wie unregelmäßigen Verben immer
    // schon die gespeicherte Zitierform (latin) selbst. Infinitiv Perfekt Aktiv
    // baut wie die Personalformen auf dem Perfektstamm auf (STAMM+isse), universell
    // über alle Klassen hinweg. Deponentien/fierī haben nur EINE "Linie": ihre
    // eigene Zitierform als "Präsens" und die periphrastische Perfekt-Form.

    const INFINITIV_LESSON = {
        'Präsens|Aktiv': 2,
        'Perfekt|Aktiv': 10,
        'Präsens|Passiv': 15,
        'Perfekt|Passiv': 16
    };

    /**
     * Prüft, ob eine bestimmte Infinitiv-Kombination für dieses Verb überhaupt
     * grammatisch sinnvoll ist (z.B. kein Perfekt Aktiv ohne gespeichertes Perfekt,
     * kein Passiv bei den 6 "reinen" unregelmäßigen Familien).
     */
    function isInfinitiveApplicable(verbObj, tempus, genus) {
        genus = genus || 'Aktiv';
        if (verbObj.type !== 'verb') return false;

        if (verbObj.gram_class === 'Deponens' || verbObj.latin === 'fierī') {
            if (tempus === 'Präsens') return true;
            if (tempus === 'Perfekt') return !!verbObj.perfect;
            return false;
        }
        if (genus === 'Aktiv') {
            if (tempus === 'Präsens') return true;
            if (tempus === 'Perfekt') return !!verbObj.perfect;
            return false;
        }
        // Passiv
        if (!isGenusApplicable(verbObj, 'Passiv')) return false;
        if (tempus === 'Präsens') return true;
        if (tempus === 'Perfekt') return !!verbObj.ppp;
        return false;
    }

    function isInfinitiveKnown(tempus, genus, maxSelectedLesson) {
        const key = tempus + '|' + (genus || 'Aktiv');
        const at = INFINITIV_LESSON[key];
        return at !== undefined && maxSelectedLesson >= at;
    }

    /**
     * Liefert eine einzelne Infinitiv-Form als String.
     * tempus: 'Präsens' | 'Perfekt'.  genus: 'Aktiv' (Standard) | 'Passiv'.
     */
    function getInfinitive(verbObj, tempus, genus) {
        genus = genus || 'Aktiv';
        if (!isInfinitiveApplicable(verbObj, tempus, genus)) {
            throw new Error(`VerbEngine: Infinitiv ${tempus} ${genus} für "${verbObj.latin}" nicht bildbar.`);
        }

        // Deponentien/fierī: eigene Zitierform = Infinitiv Präsens; Perfekt periphrastisch
        if (verbObj.gram_class === 'Deponens' || verbObj.latin === 'fierī') {
            if (tempus === 'Präsens') return verbObj.latin;
            return adjStemFromDeponentPerfect(verbObj.perfect) + 'us/a/um esse';
        }

        if (genus === 'Aktiv') {
            if (tempus === 'Präsens') return verbObj.latin;
            return getPerfectStem(verbObj) + 'isse';
        }

        // Passiv
        if (tempus === 'Präsens') {
            const stem = getPresentStem(verbObj);
            const gc = verbObj.gram_class;
            if (gc.includes('a-Konjugation')) return stem + 'ārī';
            if (gc.includes('e-Konjugation')) return stem + 'ērī';
            if (gc.includes('i-Konjugation')) return stem + 'īrī';
            return stem + 'ī'; // konsonantische/gemischte
        }
        return adjStemFromPPP(verbObj.ppp) + 'us/a/um esse';
    }

    // ============================================================
    // PPA (Partizip Präsens Aktiv)
    // ============================================================
    // Nominativ Singular hat einen LANGEN Vokal vor -ns (amāns), alle anderen
    // Formen einen KURZEN Vokal vor -nt- (amantis, amantī, ...). Deklination wie
    // ein einendiges i-Stamm-Adjektiv der 3. Deklination (Gen. Pl. -ium,
    // Nom./Akk. Pl. Neutrum -ia). Ablativ Singular hier bewusst auf "-e" (verbale
    // Verwendung im Participium coniunctum), nicht "-ī" (rein adjektivischer Gebrauch).

    const PPA_LESSON = 20;

    /**
     * Prüft, ob für dieses Verb ein PPA gebildet wird. esse (und seine Komposita)
     * sowie posse und fierī haben klassisch kein PPA.
     */
    function isPPAApplicable(verbObj) {
        if (verbObj.type !== 'verb') return false;
        if (verbObj.latin === 'posse' || verbObj.latin === 'fierī') return false;
        const fam = detectIrregularFamily(verbObj);
        if (fam && fam.base === 'esse') return false; // esse selbst UND alle esse-Komposita
        return true;
    }

    function isPPAKnown(maxSelectedLesson) {
        return maxSelectedLesson >= PPA_LESSON;
    }

    function ppaStemsByType(root, conjType) {
        if (conjType === 'a') return { nomSg: root + 'āns', oblique: root + 'ant' };
        if (conjType === 'e') return { nomSg: root + 'ēns', oblique: root + 'ent' };
        if (conjType === 'i' || conjType === 'gemischt') return { nomSg: root + 'iēns', oblique: root + 'ient' };
        return { nomSg: root + 'ēns', oblique: root + 'ent' }; // konsonantische
    }

    /** Liefert { nomSg, oblique } - die zwei Stammvarianten, aus denen sich alles Weitere ableitet. */
    function getPPAStems(verbObj) {
        if (verbObj.gram_class === 'Deponens') {
            const { stem, conjType } = getDeponentStemAndType(verbObj);
            return ppaStemsByType(stem, conjType);
        }
        const fam = detectIrregularFamily(verbObj);
        if (fam) {
            if (fam.base === 'velle') return { nomSg: fam.prefix + 'volēns', oblique: fam.prefix + 'volent' };
            if (fam.base === 'nōlle') return { nomSg: fam.prefix + 'nōlēns', oblique: fam.prefix + 'nōlent' };
            // īre: klassische Sonderform mit Stammwechsel im Oblique (iēns, aber euntis - nicht ientis!)
            if (fam.base === 'īre') return { nomSg: fam.prefix + 'iēns', oblique: fam.prefix + 'eunt' };
            if (fam.base === 'ferre') return ppaStemsByType(fam.prefix + 'fer', 'kons');
        }
        return ppaStemsByType(getPresentStem(verbObj), gramClassToConjType(verbObj.gram_class));
    }

    /**
     * Liefert die vollständige PPA-Deklination:
     * { sg: {nom, gen, dat, akkM, akkN, abl}, pl: {nomM, nomN, gen, dat, akkM, akkN, abl} }
     * akkM/nomM gelten für Maskulinum UND Femininum (einendiges Adjektiv).
     */
    function getPPADeclension(verbObj) {
        if (!isPPAApplicable(verbObj)) {
            throw new Error(`VerbEngine: "${verbObj.latin}" bildet kein PPA.`);
        }
        const { nomSg, oblique } = getPPAStems(verbObj);
        return {
            sg: { nom: nomSg, gen: oblique + 'is', dat: oblique + 'ī', akkM: oblique + 'em', akkN: nomSg, abl: oblique + 'e' },
            pl: { nomM: oblique + 'ēs', nomN: oblique + 'ia', gen: oblique + 'ium', dat: oblique + 'ibus', akkM: oblique + 'ēs', akkN: oblique + 'ia', abl: oblique + 'ibus' }
        };
    }

    // ============================================================
    // KONJUNKTIV (Präsens, Imperfekt, Perfekt, Plusquamperfekt x Aktiv/Passiv)
    // ============================================================
    // Konjunktiv Imperfekt ist bei ALLEN Verben mit "-re"-Infinitiv (reguläre
    // Klassen UND alle 6 "reinen" unregelmäßigen Familien) universell einfach
    // Infinitiv Präsens Aktiv + Personalendungen - keine Sonderformen nötig.
    // Konjunktiv Perfekt/Plusquamperfekt bauen wie im Indikativ auf dem
    // Perfektstamm auf. Nur Konjunktiv PRÄSENS hat bei esse/posse/velle/nōlle
    // echte lexikalische Unregelmäßigkeiten.

    const KONJUNKTIV_LESSON = {
        'Imperfekt': 24, 'Plusquamperfekt': 24,
        'Präsens': 28, 'Perfekt': 29
    };

    // Konjunktiv Präsens der 4 "harten" Unregelmäßigen (nicht herleitbar)
    const SUBJ_PRAESENS_IRREGULAR = {
        esse: ['sim', 'sīs', 'sit', 'sīmus', 'sītis', 'sint'],
        posse: ['possim', 'possīs', 'possit', 'possīmus', 'possītis', 'possint'],
        velle: ['velim', 'velīs', 'velit', 'velīmus', 'velītis', 'velint'],
        nōlle: ['nōlim', 'nōlīs', 'nōlit', 'nōlīmus', 'nōlītis', 'nōlint']
    };

    function subjPresentActiveByType(root, conjType) {
        if (conjType === 'a') return [root + 'em', root + 'ēs', root + 'et', root + 'ēmus', root + 'ētis', root + 'ent'];
        if (conjType === 'e') return [root + 'eam', root + 'eās', root + 'eat', root + 'eāmus', root + 'eātis', root + 'eant'];
        if (conjType === 'i' || conjType === 'gemischt') return [root + 'iam', root + 'iās', root + 'iat', root + 'iāmus', root + 'iātis', root + 'iant'];
        return [root + 'am', root + 'ās', root + 'at', root + 'āmus', root + 'ātis', root + 'ant']; // konsonantische
    }

    function subjPresentPassiveByType(root, conjType) {
        if (conjType === 'a') return [root + 'er', root + 'ēris', root + 'ētur', root + 'ēmur', root + 'ēminī', root + 'entur'];
        if (conjType === 'e') return [root + 'ear', root + 'eāris', root + 'eātur', root + 'eāmur', root + 'eāminī', root + 'eantur'];
        if (conjType === 'i' || conjType === 'gemischt') return [root + 'iar', root + 'iāris', root + 'iātur', root + 'iāmur', root + 'iāminī', root + 'iantur'];
        return [root + 'ar', root + 'āris', root + 'ātur', root + 'āmur', root + 'āminī', root + 'antur']; // konsonantische
    }

    /** Universell: Infinitiv Präsens Aktiv (endet immer auf "-re") + Personalendungen. */
    function subjImperfectActiveFromInfinitive(infPraesAktiv) {
        const base = infPraesAktiv.slice(0, -1); // finales "e" entfernen
        return [base + 'em', base + 'ēs', base + 'et', base + 'ēmus', base + 'ētis', base + 'ent'];
    }

    /** Für reguläre Klassen/Deponentien: dieselbe Basis, aber Passiv-Endungen. */
    function subjImperfectPassiveFromPseudoInfinitive(pseudoInf) {
        const base = pseudoInf.slice(0, -1);
        return [base + 'er', base + 'ēris', base + 'ētur', base + 'ēmur', base + 'ēminī', base + 'entur'];
    }

    function subjPerfectActiveFromStem(perfStem) {
        return [perfStem + 'erim', perfStem + 'erīs', perfStem + 'erit', perfStem + 'erīmus', perfStem + 'erītis', perfStem + 'erint'];
    }
    function subjPluperfectActiveFromStem(perfStem) {
        return [perfStem + 'issem', perfStem + 'issēs', perfStem + 'isset', perfStem + 'issēmus', perfStem + 'issētis', perfStem + 'issent'];
    }

    /** Periphrastisch: PPP/Perfekt-Adjektivstamm + Konjunktiv Präsens/Imperfekt von esse. */
    function subjPerfectPassiveFromStem(adjStem) {
        const sg = adjStem + 'us/a/um', pl = adjStem + 'ī/ae/a';
        const e = SUBJ_PRAESENS_IRREGULAR.esse;
        return [sg + ' ' + e[0], sg + ' ' + e[1], sg + ' ' + e[2], pl + ' ' + e[3], pl + ' ' + e[4], pl + ' ' + e[5]];
    }
    function subjPluperfectPassiveFromStem(adjStem) {
        const sg = adjStem + 'us/a/um', pl = adjStem + 'ī/ae/a';
        const e = subjImperfectActiveFromInfinitive('esse'); // essem, essēs, ... (fällt aus der Regel heraus)
        return [sg + ' ' + e[0], sg + ' ' + e[1], sg + ' ' + e[2], pl + ' ' + e[3], pl + ' ' + e[4], pl + ' ' + e[5]];
    }

    function isKonjunktivKnown(tempus, maxSelectedLesson) {
        const at = KONJUNKTIV_LESSON[tempus];
        return at !== undefined && maxSelectedLesson >= at;
    }

    /**
     * Liefert alle 6 Personalformen im Konjunktiv. tempus: 'Präsens'|'Imperfekt'|
     * 'Perfekt'|'Plusquamperfekt'. genus: 'Aktiv' (Standard) | 'Passiv'.
     */
    function getSubjunctiveForms(verbObj, tempus, genus) {
        genus = genus || 'Aktiv';
        if (!isSupported(verbObj)) throw new Error(`VerbEngine: "${verbObj.latin}" wird nicht unterstützt.`);
        if (!isGenusApplicable(verbObj, genus)) throw new Error(`VerbEngine: "${verbObj.latin}" bildet kein ${genus}.`);

        // Deponentien: Präsens/Imperfekt über den eigenen (Präsens-)Stamm + Passiv-
        // Endungen, Perfekt/Plusquamperfekt periphrastisch wie im Indikativ.
        if (verbObj.gram_class === 'Deponens') {
            const { stem, conjType } = getDeponentStemAndType(verbObj);
            if (tempus === 'Präsens') return subjPresentPassiveByType(stem, conjType);
            if (tempus === 'Imperfekt') {
                const pseudoInf = (conjType === 'kons' || conjType === 'gemischt') ? stem + 'ere' : verbObj.latin.slice(0, -1) + 'e';
                return subjImperfectPassiveFromPseudoInfinitive(pseudoInf);
            }
            const adjStem = adjStemFromDeponentPerfect(verbObj.perfect);
            return tempus === 'Perfekt' ? subjPerfectPassiveFromStem(adjStem) : subjPluperfectPassiveFromStem(adjStem);
        }

        // fierī: Präsens unregelmäßig (fīam wie konsonantische auf Stamm "fī"),
        // Imperfekt universell über die eigene Zitierform, Perfekt/Plusquamperfekt periphrastisch.
        if (verbObj.latin === 'fierī') {
            if (tempus === 'Präsens') return subjPresentActiveByType('fī', 'kons');
            if (tempus === 'Imperfekt') return subjImperfectActiveFromInfinitive(verbObj.latin.slice(0, -1) + 'e');
            const adjStem = adjStemFromDeponentPerfect(verbObj.perfect);
            return tempus === 'Perfekt' ? subjPerfectPassiveFromStem(adjStem) : subjPluperfectPassiveFromStem(adjStem);
        }

        const fam = detectIrregularFamily(verbObj);

        if (genus === 'Aktiv') {
            if (tempus === 'Imperfekt') return subjImperfectActiveFromInfinitive(getInfinitive(verbObj, 'Präsens', 'Aktiv'));
            if (tempus === 'Perfekt' || tempus === 'Plusquamperfekt') {
                if (!verbObj.perfect) throw new Error(`VerbEngine: Kein Perfektstamm für "${verbObj.latin}" hinterlegt.`);
                const perfStem = getPerfectStem(verbObj);
                return tempus === 'Perfekt' ? subjPerfectActiveFromStem(perfStem) : subjPluperfectActiveFromStem(perfStem);
            }
            // Präsens
            if (fam) {
                if (SUBJ_PRAESENS_IRREGULAR[fam.base]) return SUBJ_PRAESENS_IRREGULAR[fam.base].map(f => fam.prefix + f);
                if (fam.base === 'īre') return subjPresentActiveByType(fam.prefix + 'e', 'kons');
                if (fam.base === 'ferre') return subjPresentActiveByType(fam.prefix + 'fer', 'kons');
            }
            return subjPresentActiveByType(getPresentStem(verbObj), gramClassToConjType(verbObj.gram_class));
        }

        // Passiv (nur reguläre Konjugationsklassen, s. isGenusApplicable)
        if (tempus === 'Präsens') return subjPresentPassiveByType(getPresentStem(verbObj), gramClassToConjType(verbObj.gram_class));
        if (tempus === 'Imperfekt') return subjImperfectPassiveFromPseudoInfinitive(getInfinitive(verbObj, 'Präsens', 'Aktiv'));
        if (!verbObj.ppp) throw new Error(`VerbEngine: Kein PPP für "${verbObj.latin}" hinterlegt.`);
        const adjStem = adjStemFromPPP(verbObj.ppp);
        return tempus === 'Perfekt' ? subjPerfectPassiveFromStem(adjStem) : subjPluperfectPassiveFromStem(adjStem);
    }

    // ============================================================
    // GERUNDIUM (Verbalsubstantiv, nur Neutrum Sg., kein Nominativ) und
    // GERUNDIVUM (Verbaladjektiv, dekliniert komplett wie -us/-a/-um).
    // Teilen sich denselben Stamm: a-Konj "-and-", i-Konj/gemischte "-iend-",
    // e-Konj/konsonantische "-end-".
    // ============================================================

    const GERUNDIVE_LESSON = 33; // T2

    /**
     * esse/posse/velle/nōlle/fierī (und esse-Komposita) bilden klassisch kein
     * Gerundium/Gerundivum. Deponentien und īre/ferre (+Komposita) hingegen schon.
     */
    function isGerundiveApplicable(verbObj) {
        if (verbObj.type !== 'verb') return false;
        if (verbObj.latin === 'posse' || verbObj.latin === 'velle' || verbObj.latin === 'nōlle' || verbObj.latin === 'fierī') return false;
        const fam = detectIrregularFamily(verbObj);
        if (fam && fam.base === 'esse') return false; // esse selbst UND alle esse-Komposita
        return true;
    }

    function isGerundiveKnown(maxSelectedLesson) {
        return maxSelectedLesson >= GERUNDIVE_LESSON;
    }

    function gerundStemByType(root, conjType) {
        if (conjType === 'a') return root + 'and';
        if (conjType === 'i' || conjType === 'gemischt') return root + 'iend';
        return root + 'end'; // e/konsonantische
    }

    /** Liefert den reinen "-and-/-end-/-iend-"-Stamm, aus dem sich alles Weitere ableitet. */
    function getGerundStem(verbObj) {
        if (verbObj.gram_class === 'Deponens') {
            const { stem, conjType } = getDeponentStemAndType(verbObj);
            return gerundStemByType(stem, conjType);
        }
        const fam = detectIrregularFamily(verbObj);
        if (fam) {
            // īre: Sonderform mit Stammwechsel wie beim PPA (eund- statt iend-)
            if (fam.base === 'īre') return fam.prefix + 'eund';
            if (fam.base === 'ferre') return gerundStemByType(fam.prefix + 'fer', 'kons');
        }
        return gerundStemByType(getPresentStem(verbObj), gramClassToConjType(verbObj.gram_class));
    }

    /** Gerundium: { gen, dat, akk, abl } - immer Neutrum Singular, kein Nominativ. */
    function getGerundium(verbObj) {
        if (!isGerundiveApplicable(verbObj)) {
            throw new Error(`VerbEngine: "${verbObj.latin}" bildet kein Gerundium.`);
        }
        const stem = getGerundStem(verbObj);
        return { gen: stem + 'ī', dat: stem + 'ō', akk: stem + 'um', abl: stem + 'ō' };
    }

    /**
     * Gerundivum: vollständige Deklination wie ein -us/-a/-um-Adjektiv, in
     * derselben kombinierten Genus-Schreibweise wie beim PPP (z.B. "amandus/a/um").
     */
    function getGerundivumDeclension(verbObj) {
        if (!isGerundiveApplicable(verbObj)) {
            throw new Error(`VerbEngine: "${verbObj.latin}" bildet kein Gerundivum.`);
        }
        const s = getGerundStem(verbObj);
        return {
            sg: { nom: s + 'us/a/um', gen: s + 'ī/ae/ī', dat: s + 'ō/ae/ō', akk: s + 'um/am/um', abl: s + 'ō/ā/ō' },
            pl: { nom: s + 'ī/ae/a', gen: s + 'ōrum/ārum/ōrum', dat: s + 'īs', akk: s + 'ōs/ās/a', abl: s + 'īs' }
        };
    }

    return {
        isSupported,
        isGenusApplicable,
        isTempusKnown,
        getKnownTempora,
        getKnownCombinations,
        getFormsForTempus,
        getForm,
        getPresentStem,
        getPerfectStem,
        isImperativeApplicable,
        isImperativeKnown,
        getImperative,
        isInfinitiveApplicable,
        isInfinitiveKnown,
        getInfinitive,
        IMPERATIV_LESSON,
        INFINITIV_LESSON,
        isPPAApplicable,
        isPPAKnown,
        getPPAStems,
        getPPADeclension,
        PPA_LESSON,
        isKonjunktivKnown,
        getSubjunctiveForms,
        KONJUNKTIV_LESSON,
        isGerundiveApplicable,
        isGerundiveKnown,
        getGerundium,
        getGerundivumDeclension,
        GERUNDIVE_LESSON,
        TEMPORA,
        GENERA,
        TEMPUS_LESSON_AKTIV,
        TEMPUS_LESSON_PASSIV
    };
})();


