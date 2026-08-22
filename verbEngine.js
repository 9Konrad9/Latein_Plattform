// verbEngine.js
// Zentrale, wiederverwendbare Konjugations-Engine für Verben.
//
// AUSBAUSTAND (Schritt 1): Aktiv/Indikativ vollständig, für die 5 regulären
// Konjugationsklassen (a-, e-, i-, konsonantische, gemischte Konjugation),
// über alle 5 Tempora (Präsens, Imperfekt, Futur I, Perfekt, Plusquamperfekt).
//
// NICHT abgedeckt (bewusst spätere Ausbauschritte):
// - Die 7 unregelmäßigen Verbfamilien (esse, posse, velle, nōlle, īre+Komposita,
//   ferre+Komposita) und fierī -> eigener Schritt mit Sonderformen-Tabellen
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
     * Prüft, ob ein Verb von dieser Engine (Schritt 1: reguläres Aktiv/Indikativ) abgedeckt wird.
     * Deponentien, die 7 unregelmäßigen Familien und fierī liefern false.
     */
    function isSupported(verbObj) {
        if (verbObj.type !== 'verb') return false;
        if (verbObj.gram_class === 'Deponens') return false;
        if (verbObj.gram_class === 'unregelmäßiges Verb') return false;
        if (verbObj.gram_class === 'unregelmäßig (Passiv von facere)') return false;
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
        // 1. Pers. Sg. Perfekt endet immer auf "ī" (bei regulären Verben)
        return verbObj.perfect.slice(0, -1);
    }

    /**
     * Präsens Aktiv Indikativ, alle 6 Personen.
     */
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

    /**
     * Imperfekt Aktiv Indikativ, alle 6 Personen.
     */
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

    /**
     * Futur I Aktiv Indikativ, alle 6 Personen.
     * a-/e-Konjugation: b-Futur. i-/konsonantische/gemischte Konjugation: a-/e-Futur.
     */
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

    /**
     * Perfekt Aktiv Indikativ, alle 6 Personen. Unabhängig von der Konjugationsklasse -
     * das Perfektsystem baut IMMER auf dem gespeicherten Perfektstamm auf.
     */
    function perfectActive(verbObj) {
        const stem = getPerfectStem(verbObj);
        return [stem + 'ī', stem + 'istī', stem + 'it', stem + 'imus', stem + 'istis', stem + 'ērunt'];
    }

    /**
     * Plusquamperfekt Aktiv Indikativ, alle 6 Personen. Ebenfalls klassenunabhängig
     * auf dem Perfektstamm aufbauend.
     */
    function pluperfectActive(verbObj) {
        const stem = getPerfectStem(verbObj);
        return [stem + 'eram', stem + 'erās', stem + 'erat', stem + 'erāmus', stem + 'erātis', stem + 'erant'];
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
            throw new Error(`VerbEngine: "${verbObj.latin}" wird von Schritt 1 nicht abgedeckt (Deponens/unregelmäßig).`);
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
