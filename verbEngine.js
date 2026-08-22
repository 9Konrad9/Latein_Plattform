// verbEngine.js
// Zentrale, wiederverwendbare Konjugations-Engine für Verben.
//
// AUSBAUSTAND (Schritt 1 + 1b): Aktiv/Indikativ vollständig, für:
// - die 5 regulären Konjugationsklassen (a-, e-, i-, konsonantische, gemischte)
// - die 7 unregelmäßigen Verbfamilien: esse (+adesse/abesse/interesse/praeesse),
//   posse, velle, nōlle, īre (+Komposita), ferre (+Komposita)
// über alle 5 Tempora (Präsens, Imperfekt, Futur I, Perfekt, Plusquamperfekt).
//
// NICHT abgedeckt (bewusst spätere Ausbauschritte):
// - fierī (grammatisch eng mit Passiv verbunden -> wird dort mitgebaut)
// - Passiv, Konjunktiv, Imperativ, Gerundium/Gerundivum -> spätere Ausbaustufen
//
// isSupported(verbObj) MUSS vor jedem getForm()-Aufruf geprüft werden.
//
// Einbinden per <script src="verbEngine.js"></script> NACH vocabulary.js.

const VerbEngine = (() => {

    // Ab welcher Lektion ein Tempus grundsätzlich als bekannt gilt (unabhängig davon,
    // wann das einzelne Wort selbst eingeführt wurde). Präsens braucht keinen Eintrag,
    // da es automatisch verfügbar ist, sobald das Wort selbst im gewählten Pool ist.
    const TEMPUS_LESSON = {
        'Perfekt': 10,
        'Imperfekt': 12,
        'FuturI': 13,
        'Plusquamperfekt': 14
    };

    const TEMPORA = ['Präsens', 'Imperfekt', 'FuturI', 'Perfekt', 'Plusquamperfekt'];

    /**
     * Prüft, ob ein Verb von dieser Engine abgedeckt wird.
     * Deponentien und fierī liefern false (fierī gehört inhaltlich zum Passiv-Ausbauschritt).
     */
    function isSupported(verbObj) {
        if (verbObj.type !== 'verb') return false;
        if (verbObj.gram_class === 'Deponens') return false;
        if (verbObj.gram_class === 'unregelmäßig (Passiv von facere)') return false; // fierī
        return true;
    }

    /**
     * Prüft, ob ein bestimmtes Tempus für die gewählte Lektionsauswahl bereits bekannt ist.
     * maxSelectedLesson: höchste gewählte Lektion (siehe lessonFilter.js zweiter Callback-Parameter).
     */
    function isTempusKnown(tempus, maxSelectedLesson) {
        if (tempus === 'Präsens') return true;
        const introducedAt = TEMPUS_LESSON[tempus];
        if (introducedAt === undefined) return false; // unbekanntes Tempus, sicherheitshalber sperren
        return maxSelectedLesson >= introducedAt;
    }

    /**
     * Liefert die Liste der Tempora, die für die gegebene Lektionsauswahl bereits bekannt sind.
     */
    function getKnownTempora(maxSelectedLesson) {
        return TEMPORA.filter(t => isTempusKnown(t, maxSelectedLesson));
    }

    function getPresentStem(verbObj) {
        return verbObj.latin.slice(0, -3); // āre/ēre/īre/ere sind immer 3 Zeichen lang
    }

    function getPerfectStem(verbObj) {
        // 1. Pers. Sg. Perfekt endet immer auf "ī"
        return verbObj.perfect.slice(0, -1);
    }

    /**
     * Perfekt Aktiv Indikativ, alle 6 Personen. Baut IMMER auf dem gespeicherten
     * Perfektstamm auf - unabhängig von Konjugationsklasse, funktioniert daher auch
     * für die unregelmäßigen Verbfamilien, deren Perfekt/Plusquamperfekt trotz
     * unregelmäßigem Präsensstamm einer regulären Perfektendung folgt.
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
    // REGULÄRE KONJUGATIONSKLASSEN (a-, e-, i-, konsonantische, gemischte)
    // ============================================================

    function presentActive(verbObj) {
        const stem = getPresentStem(verbObj);
        const gc = verbObj.gram_class;
        if (gc.includes('a-Konjugation')) {
            return [stem + 'ō', stem + 'ās', stem + 'at', stem + 'āmus', stem + 'ātis', stem + 'ant'];
        }
        if (gc.includes('e-Konjugation')) {
            return [stem + 'eō', stem + 'ēs', stem + 'et', stem + 'ēmus', stem + 'ētis', stem + 'ent'];
        }
        if (gc.includes('i-Konjugation')) {
            return [stem + 'iō', stem + 'īs', stem + 'it', stem + 'īmus', stem + 'ītis', stem + 'iunt'];
        }
        if (gc.includes('gemischte')) {
            return [stem + 'iō', stem + 'is', stem + 'it', stem + 'imus', stem + 'itis', stem + 'iunt'];
        }
        // konsonantische Konjugation (Standardfall)
        return [stem + 'ō', stem + 'is', stem + 'it', stem + 'imus', stem + 'itis', stem + 'unt'];
    }

    function imperfectActive(verbObj) {
        const stem = getPresentStem(verbObj);
        const gc = verbObj.gram_class;
        if (gc.includes('a-Konjugation')) {
            return [stem + 'ābam', stem + 'ābās', stem + 'ābat', stem + 'ābāmus', stem + 'ābātis', stem + 'ābant'];
        }
        if (gc.includes('i-Konjugation') || gc.includes('gemischte')) {
            return [stem + 'iēbam', stem + 'iēbās', stem + 'iēbat', stem + 'iēbāmus', stem + 'iēbātis', stem + 'iēbant'];
        }
        // e-Konjugation und konsonantische Konjugation teilen sich dasselbe Muster
        return [stem + 'ēbam', stem + 'ēbās', stem + 'ēbat', stem + 'ēbāmus', stem + 'ēbātis', stem + 'ēbant'];
    }

    function futureIActive(verbObj) {
        const stem = getPresentStem(verbObj);
        const gc = verbObj.gram_class;
        if (gc.includes('a-Konjugation')) {
            return [stem + 'ābō', stem + 'ābis', stem + 'ābit', stem + 'ābimus', stem + 'ābitis', stem + 'ābunt'];
        }
        if (gc.includes('e-Konjugation')) {
            return [stem + 'ēbō', stem + 'ēbis', stem + 'ēbit', stem + 'ēbimus', stem + 'ēbitis', stem + 'ēbunt'];
        }
        if (gc.includes('i-Konjugation') || gc.includes('gemischte')) {
            return [stem + 'iam', stem + 'iēs', stem + 'iet', stem + 'iēmus', stem + 'iētis', stem + 'ient'];
        }
        // konsonantische Konjugation
        return [stem + 'am', stem + 'ēs', stem + 'et', stem + 'ēmus', stem + 'ētis', stem + 'ent'];
    }

    // ============================================================
    // UNREGELMÄSSIGE VERBFAMILIEN (Schritt 1b)
    // ============================================================

    // esse, posse, velle, nōlle: komplette Sonderformen-Tabellen für alle 5 Tempora.
    // Perfekt/Plusquamperfekt hier ebenfalls fest hinterlegt (statt über perfectActive/
    // pluperfectActive aus dem gespeicherten perfect-Feld), da diese vier Verben so
    // zentral sind, dass maximale Absicherung wichtiger ist als Wiederverwendung.
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

    // īre und ferre: nur Präsens (+ bei īre auch Imperfekt/Futur) sind wirklich
    // unregelmäßig. Perfekt/Plusquamperfekt folgen der regulären Endung auf dem
    // gespeicherten Perfektstamm (siehe perfectActive/pluperfectActive) und werden
    // daher hier NICHT hinterlegt.
    const IRE_BASE = {
        'Präsens': ['eō', 'īs', 'it', 'īmus', 'ītis', 'eunt'],
        'Imperfekt': ['ībam', 'ībās', 'ībat', 'ībāmus', 'ībātis', 'ībant'],
        'FuturI': ['ībō', 'ībis', 'ībit', 'ībimus', 'ībitis', 'ībunt']
    };

    const FERRE_BASE = {
        'Präsens': ['ferō', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt']
    };

    /**
     * Erkennt, zu welcher unregelmäßigen Familie ein Verb gehört, und liefert
     * das nötige Präfix zurück (z.B. "ad" bei adīre, "" bei īre selbst).
     * Gibt null zurück, wenn das Verb zu keiner der Sonderfamilien gehört.
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
        if (latin.endsWith('esse') && latin !== 'esse') {
            return { base: 'esse', prefix: latin.slice(0, -4) };
        }
        if (latin.endsWith('īre')) {
            return { base: 'īre', prefix: latin.slice(0, -3) };
        }
        if (latin.endsWith('ferre')) {
            return { base: 'ferre', prefix: latin.slice(0, -5) };
        }
        return null;
    }

    /**
     * Liefert die Formen eines unregelmäßigen Verbs für ein Tempus, oder null,
     * wenn das Verb zu keiner unregelmäßigen Familie gehört.
     */
    function irregularForms(verbObj, tempus) {
        const fam = detectIrregularFamily(verbObj);
        if (!fam) return null;

        // esse, posse, velle, nōlle: direkt aus der kompletten Tabelle (mit Präfix bei Komposita)
        if (fam.base === 'esse' || fam.base === 'posse' || fam.base === 'velle' || fam.base === 'nōlle') {
            const table = BASE_TABLES[fam.base][tempus];
            if (!table) return null;
            if (!fam.prefix) return table;
            // esse-Komposita: Präfix + Basisform (z.B. ad+sum -> adsum). Perfekt/Plusquamperfekt
            // NICHT hier ableiten (abesse hat die Ausnahme āfuī statt "ab"+"fuī") - dafür wird
            // stattdessen unten der gespeicherte perfect-Wert des jeweiligen Kompositums genutzt.
            if (tempus === 'Perfekt' || tempus === 'Plusquamperfekt') {
                return tempus === 'Perfekt' ? perfectActive(verbObj) : pluperfectActive(verbObj);
            }
            return table.map(f => fam.prefix + f);
        }

        // īre und Komposita
        if (fam.base === 'īre') {
            if (tempus === 'Perfekt') return perfectActive(verbObj);
            if (tempus === 'Plusquamperfekt') return pluperfectActive(verbObj);
            const table = IRE_BASE[tempus];
            if (!table) return null;
            return fam.prefix ? table.map(f => fam.prefix + f) : table;
        }

        // ferre und Komposita
        if (fam.base === 'ferre') {
            if (tempus === 'Präsens') {
                return FERRE_BASE['Präsens'].map(f => fam.prefix + f);
            }
            // Imperfekt/Futur folgen der regulären konsonantischen Endung auf dem
            // (präfigierten) Präsensstamm "fer"; Perfekt/Plusquamperfekt auf dem
            // gespeicherten Perfektstamm des jeweiligen Kompositums.
            const pseudoStem = fam.prefix + 'fer';
            if (tempus === 'Imperfekt') {
                return [pseudoStem + 'ēbam', pseudoStem + 'ēbās', pseudoStem + 'ēbat', pseudoStem + 'ēbāmus', pseudoStem + 'ēbātis', pseudoStem + 'ēbant'];
            }
            if (tempus === 'FuturI') {
                return [pseudoStem + 'am', pseudoStem + 'ēs', pseudoStem + 'et', pseudoStem + 'ēmus', pseudoStem + 'ētis', pseudoStem + 'ent'];
            }
            if (tempus === 'Perfekt') return perfectActive(verbObj);
            if (tempus === 'Plusquamperfekt') return pluperfectActive(verbObj);
        }

        return null;
    }

    const BUILDERS = {
        'Präsens': presentActive,
        'Imperfekt': imperfectActive,
        'FuturI': futureIActive,
        'Perfekt': perfectActive,
        'Plusquamperfekt': pluperfectActive
    };

    /**
     * Liefert alle 6 Personalformen für ein Tempus (Aktiv/Indikativ).
     * Wirft einen Fehler, wenn das Verb nicht unterstützt wird (vorher isSupported() prüfen!)
     * oder Perfekt/Plusquamperfekt ohne vorhandenen Perfektstamm angefragt werden.
     */
    function getFormsForTempus(verbObj, tempus) {
        if (!isSupported(verbObj)) {
            throw new Error(`VerbEngine: "${verbObj.latin}" wird nicht unterstützt (Deponens oder fierī).`);
        }
        if (verbObj.gram_class !== 'Deponens') {
            const irregular = irregularForms(verbObj, tempus);
            if (irregular) return irregular;
        }
        if ((tempus === 'Perfekt' || tempus === 'Plusquamperfekt') && !verbObj.perfect) {
            throw new Error(`VerbEngine: Kein Perfektstamm für "${verbObj.latin}" hinterlegt.`);
        }
        const builder = BUILDERS[tempus];
        if (!builder) {
            throw new Error(`VerbEngine: Unbekanntes Tempus "${tempus}".`);
        }
        return builder(verbObj);
    }

    /**
     * Bequemlichkeitsfunktion: liefert eine einzelne Form (0=1.Sg ... 5=3.Pl).
     */
    function getForm(verbObj, tempus, personIdx) {
        return getFormsForTempus(verbObj, tempus)[personIdx];
    }

    return {
        isSupported,
        isTempusKnown,
        getKnownTempora,
        getFormsForTempus,
        getForm,
        getPresentStem,
        getPerfectStem,
        TEMPORA,
        TEMPUS_LESSON
    };
})();
