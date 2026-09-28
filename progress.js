// progress.js
// Zentrale Fortschritts-Speicherung für Lūdī Rōmānī.
// Nutzt localStorage — funktioniert offline, pro Gerät/Browser, ohne Server.
// Einbinden per <script src="progress.js"></script> VOR dem jeweiligen Spiel-Script.

const LudiProgress = (() => {
    const STORAGE_KEY = 'ludiRomani_progress_v1';

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const data = raw ? JSON.parse(raw) : {};
            if (!data.games) data.games = {};
            if (!data.vocab) data.vocab = {};
            if (!data.achievements) {
                data.achievements = {
                    streakCurrent: 0,
                    streakBest: 0,
                    totalAnswered: 0,
                    daysPlayed: [],
                    categories: {},
                    unlockedTiers: {} // z.B. { 'streak': 2, 'cat_Imperativ': 1 } - höchste bereits gezeigte Stufe (0=keine)
                };
            }
            return data;
        } catch (e) {
            console.warn('Fortschritt konnte nicht geladen werden:', e);
            return { games: {}, vocab: {}, achievements: { streakCurrent: 0, streakBest: 0, totalAnswered: 0, daysPlayed: [], categories: {}, unlockedTiers: {} } };
        }
    }

    function _save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Fortschritt konnte nicht gespeichert werden:', e);
        }
    }

    /**
     * Ergebnis eines Spieldurchlaufs speichern.
     * gameId: eindeutiger Kurzname, z.B. "quiz", "kastell"
     * score: erreichte Punkte / verbleibende Stärke etc.
     * maxScore: maximal mögliche Punktzahl (für Prozent-Anzeige)
     */
    function saveGameResult(gameId, score, maxScore) {
        const data = _load();
        const prev = data.games[gameId];
        const now = new Date().toISOString();

        const eintrag = {
            bestScore: prev ? Math.max(prev.bestScore, score) : score,
            maxScore: maxScore,
            lastScore: score,
            lastPlayed: now,
            timesPlayed: (prev ? prev.timesPlayed : 0) + 1
        };
        /* Der Eintrag wird hier NEU gebaut - alles, was sonst noch daran
           haengt, muss ausdruecklich mit. Vergessen kostete die Bestleistung
           aus recordBest(): Issas Hoehe wurde gespeichert und von der
           naechsten Runde sofort wieder geloescht. Gefunden vom Test.
           Wer hier ein Feld ergaenzt, ergaenzt es auch in dieser Zeile. */
        if (prev && prev.bests) eintrag.bests = prev.bests;
        data.games[gameId] = eintrag;
        _save(data);
    }

    /**
     * Eine ZWEITE Bestleistung neben bestScore.
     *
     * bestScore ist überall im Projekt die Lernquote ("richtig von gesamt"),
     * und das Hauptmenü wie die Trophäenseite lesen sie so. Issas erreichte
     * Höhe ist etwas anderes: eine Spielleistung, ohne Bezugsgröße. Sie käme
     * dort also als "142 / 45" heraus - deshalb ein eigenes Fach.
     *
     * Gespeichert wird nur, was besser ist. Rückgabe: { neu, wert, unlock }.
     */
    function recordBest(gameId, name, wert) {
        const data = _load();
        const spiel = data.games[gameId] || (data.games[gameId] = {
            bestScore: 0, maxScore: null, lastScore: 0, lastPlayed: null, timesPlayed: 0
        });
        if (!spiel.bests) spiel.bests = {};
        const vorher = spiel.bests[name] || 0;
        if (wert <= vorher) return { neu: false, wert: vorher, unlock: null };

        spiel.bests[name] = wert;
        const paar = BEST_ACHIEVEMENTS.find(b => b.gameId === gameId && b.best === name);
        const def = paar && FIXED_ACHIEVEMENTS.find(f => f.id === paar.achievement);
        const unlock = def
            ? _checkUnlock(data, def.id, wert, def.thresholds, { icon: def.icon, title: def.title, unit: def.unit })
            : null;
        _save(data);
        return { neu: true, wert: wert, unlock: unlock };
    }

    function getBest(gameId, name) {
        const spiel = _load().games[gameId];
        return (spiel && spiel.bests && spiel.bests[name]) || 0;
    }

    function getGameProgress(gameId) {
        const data = _load();
        return data.games[gameId] || null;
    }

    function getAllProgress() {
        return _load();
    }

    const MAX_BOX = 4; // 5 Stufen: 0, 1, 2, 3, 4

    /**
     * Einzelnen Vokabel-Versuch protokollieren UND das Ampel-Level (Leitner-Box) anpassen.
     * Intern 5 Stufen (0-4) statt nur 3: Bei Multiple-Choice mit 4 Antworten läge die
     * Ratewahrscheinlichkeit für "2x hintereinander richtig geraten" bei ca. 6% - zu hoch,
     * um eine Vokabel danach kaum noch abzufragen. Bei 5 Stufen bräuchte es 4 Treffer in
     * Folge (~0,4%), das ist robuster gegen Zufallstreffer.
     * Richtig beantwortet -> ein Level nach oben (bis max. Stufe 4).
     * Falsch beantwortet -> zurück auf Stufe 0.
     */
    function recordVocabAttempt(latinWord, correct) {
        const data = _load();
        if (!data.vocab[latinWord]) {
            data.vocab[latinWord] = { correct: 0, wrong: 0, box: 0 };
        }
        const entry = data.vocab[latinWord];
        if (entry.box === undefined) entry.box = 0; // Altbestand ohne Box-Feld absichern

        if (correct) {
            entry.correct++;
            entry.box = Math.min(entry.box + 1, MAX_BOX);
        } else {
            entry.wrong++;
            entry.box = 0;
        }

        // Spielübergreifende Achievement-Werte mitpflegen (Serie, Gesamtzahl, Spieltage)
        const a = data.achievements;
        a.totalAnswered++;
        if (correct) {
            a.streakCurrent++;
            a.streakBest = Math.max(a.streakBest, a.streakCurrent);
        } else {
            a.streakCurrent = 0;
        }
        const today = _todayString();
        if (!a.daysPlayed) a.daysPlayed = [];
        if (!a.daysPlayed.includes(today)) a.daysPlayed.push(today);

        const greenCount = Object.values(data.vocab).filter(v => (v.box || 0) >= MAX_BOX).length;
        const unlocks = [];
        const u1 = _checkUnlock(data, 'streak', a.streakBest, FIXED_ACHIEVEMENTS[0].thresholds, { icon: FIXED_ACHIEVEMENTS[0].icon, title: FIXED_ACHIEVEMENTS[0].title, unit: FIXED_ACHIEVEMENTS[0].unit });
        const u2 = _checkUnlock(data, 'total', a.totalAnswered, FIXED_ACHIEVEMENTS[1].thresholds, { icon: FIXED_ACHIEVEMENTS[1].icon, title: FIXED_ACHIEVEMENTS[1].title, unit: FIXED_ACHIEVEMENTS[1].unit });
        const u3 = _checkUnlock(data, 'mastery', greenCount, FIXED_ACHIEVEMENTS[2].thresholds, { icon: FIXED_ACHIEVEMENTS[2].icon, title: FIXED_ACHIEVEMENTS[2].title, unit: FIXED_ACHIEVEMENTS[2].unit });
        const u4 = _checkUnlock(data, 'days', a.daysPlayed.length, FIXED_ACHIEVEMENTS[3].thresholds, { icon: FIXED_ACHIEVEMENTS[3].icon, title: FIXED_ACHIEVEMENTS[3].title, unit: FIXED_ACHIEVEMENTS[3].unit });
        [u1, u2, u3, u4].forEach(u => { if (u) unlocks.push(u); });

        _save(data);
        return unlocks;
    }

    /**
     * Gibt das aktuelle Ampel-Level einer Vokabel zurück (0 bis 4).
     * Noch nie abgefragte Vokabeln gelten als Stufe 0.
     */
    function getBoxLevel(latinWord) {
        const data = _load();
        return (data.vocab[latinWord] && data.vocab[latinWord].box !== undefined)
            ? data.vocab[latinWord].box
            : 0;
    }

    /**
     * Ordnet eine interne Stufe (0-4) einer der 3 Anzeigefarben zu.
     * Rückgabe: 0 = rot, 1 = gelb, 2 = grün.
     * Stufe 0-1 -> rot, Stufe 2-3 -> gelb, Stufe 4 -> grün.
     */
    function getColorIndex(box) {
        if (box <= 1) return 0;
        if (box <= 3) return 1;
        return 2;
    }

    /**
     * Bequemlichkeitsfunktion: liefert direkt den Farb-Index (0-2) für ein Wort.
     */
    function getBoxColor(latinWord) {
        return getColorIndex(getBoxLevel(latinWord));
    }

    /* Was zuletzt drankam, kommt nicht gleich wieder.

       Aus dem Unterricht gemeldet (Issa springt, Lektion 1): "Es waren
       eigentlich immer dieselben fünf, sechs Vokabeln und sogar manchmal
       dieselbe Vokabel hintereinander." Nachgemessen, und zwar genau so:
       Lektion 1 gibt für Issa nur zehn Wörter her. Bei frischem Kasten
       wiederholte sich das Wort in 10 % der Runden SOFORT, und die sechs
       häufigsten machten 69 % aus. Nach ein paar richtigen Antworten wurde es
       schlimmer statt besser - 13 % und 86 % -, weil die Gewichtung die
       gekonnten Wörter herausnimmt und der Rest umso enger wird.

       Das ist kein Fehler der Gewichtung, die soll das so. Der Fehler ist, dass
       nichts die unmittelbare Wiederholung verhindert hat. Deshalb merkt sich
       diese Funktion die letzten Ziehungen und sperrt sie - aber nur, solange
       danach noch genug übrig bleibt. Bei vier Wörtern im Topf wird nichts
       gesperrt, sonst zöge sie irgendwann ins Leere.

       Die Erinnerung liegt hier und nicht in den Spielen: Alle fünf Spiele mit
       weightedPick haben dasselbe Problem, und keines soll es einzeln lösen
       müssen. */
    let _zuletztGezogen = [];

    function _merkTiefe(n) {
        // Ein Drittel des Topfes, höchstens vier - bei zehn Wörtern also drei.
        return Math.max(0, Math.min(4, Math.floor(n / 3)));
    }

    /**
     * Wählt zufällig ein Element aus dem Pool, gewichtet nach Ampel-Level:
     * niedrigere Stufen erscheinen deutlich häufiger als hohe.
     * pool: Array von Objekten mit einem "latin"-Feld.
     * tiefe: wie viele der zuletzt gezogenen gesperrt werden (optional;
     *        ohne Angabe ein Drittel des Topfes, höchstens vier).
     */
    function weightedPick(pool, tiefe) {
        if (!pool || pool.length === 0) return null;
        const data = _load();
        const boxWeights = [5, 4, 3, 2, 1]; // Stufe 0..4

        const gesperrt = new Set(_zuletztGezogen.slice(-(tiefe === undefined ? _merkTiefe(pool.length) : tiefe)));
        let topf = pool.filter(item => !gesperrt.has(item.latin));
        // Sicherheitsnetz: Wenn die Sperre fast alles wegnimmt, gilt sie nicht.
        if (topf.length < 2) topf = pool;

        const weights = topf.map(item => {
            const entry = data.vocab[item.latin];
            const box = (entry && entry.box !== undefined) ? entry.box : 0;
            return boxWeights[box];
        });

        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        let gewaehlt = topf[topf.length - 1];
        for (let i = 0; i < topf.length; i++) {
            r -= weights[i];
            if (r <= 0) { gewaehlt = topf[i]; break; }
        }

        _zuletztGezogen.push(gewaehlt.latin);
        if (_zuletztGezogen.length > 8) _zuletztGezogen.shift();
        return gewaehlt;
    }

    /* Für Tests und für den Start einer neuen Runde: Die Erinnerung leeren. */
    function resetPickMemory() { _zuletztGezogen = []; }

    /**
     * Gibt eine Zusammenfassung zurück, wie viele Wörter eines Pools in welcher
     * Ampel-Farbe stehen (z.B. für eine kleine Fortschrittsanzeige im Spiel).
     * red/yellow/green sind eindeutige Kategorien und summieren sich zu pool.length.
     * "unseen" ist eine Teilmenge von "red" (noch nie abgefragte Vokabeln).
     */
    function getBoxSummary(pool) {
        const data = _load();
        const summary = { red: 0, yellow: 0, green: 0, unseen: 0 };
        pool.forEach(item => {
            const entry = data.vocab[item.latin];
            if (!entry) { summary.unseen++; summary.red++; return; }
            const box = entry.box !== undefined ? entry.box : 0;
            const colorIdx = getColorIndex(box);
            if (colorIdx === 0) summary.red++;
            else if (colorIdx === 1) summary.yellow++;
            else summary.green++;
        });
        return summary;
    }

    /**
     * Gibt die N Vokabeln mit der höchsten Fehlerquote zurück
     * (mind. 2 Versuche, damit Zufallstreffer nicht verzerren).
     */
    function getWeakVocab(n = 10) {
        const data = _load();
        return Object.entries(data.vocab)
            .map(([word, stats]) => ({
                word,
                ...stats,
                total: stats.correct + stats.wrong,
                errorRate: stats.wrong / (stats.correct + stats.wrong)
            }))
            .filter(v => v.total >= 2)
            .sort((a, b) => b.errorRate - a.errorRate)
            .slice(0, n);
    }

    function resetProgress() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ============================================================
    // ACHIEVEMENTS
    // ============================================================

    const TIER_NAMES = ['Bronze', 'Silber', 'Gold', 'Diamant'];

    // Die festen Achievements. Die ersten vier sind spielübergreifend und
    // hängen an recordVocabAttempt; das fünfte gehört zu EINEM Spiel und hängt
    // an einer Bestleistung (siehe BEST_ACHIEVEMENTS darunter).
    // Die Indizes 0 bis 3 werden weiter oben einzeln angesprochen - neue
    // Einträge deshalb HINTEN anhängen.
    const FIXED_ACHIEVEMENTS = [
        { id: 'streak', icon: '🔥', title: 'Serien-Meister', unit: 'Fragen in Folge richtig', thresholds: [5, 10, 20, 50], bereich: 'allgemein' },
        { id: 'total', icon: '📚', title: 'Fleißiges Bienchen', unit: 'Fragen insgesamt beantwortet', thresholds: [100, 500, 1000, 2500], bereich: 'allgemein' },
        { id: 'mastery', icon: '🟢', title: 'Vokabel-Meisterschaft', unit: 'Vokabeln auf Grün', thresholds: [50, 200, 500, 900], bereich: 'allgemein' },
        { id: 'days', icon: '📅', title: 'Beständigkeit', unit: 'verschiedene Tage gespielt', thresholds: [3, 7, 14, 30], bereich: 'allgemein' },
        /* Issas Höhe ist ausnahmsweise eine SPIELleistung - und doch eine
           ehrliche Lernmarke: Höher kommt nur, wer trifft. Drei Herzen enden
           den Lauf, und eine Antwortreihe liegt je drei Plattformreihen
           auseinander, also rund 40 Meter. 200 m sind damit etwa fünf Wörter
           am Stück, 2000 m etwa fünfzig. */
        /* `bereich` sagt der Trophaeenseite, unter welche Ueberschrift die
           Karte gehoert. Vorher stand die Zuordnung dort als feste Liste von
           vier Kennungen - und alles, was NICHT darin stand, landete unter
           "Formen & Wortarten". Die Höhe erschien dadurch zwischen den
           Wortarten. Wer hier eine Trophäe ergänzt, vergisst die Liste dort
           sonst wieder. */
        { id: 'hoehe', icon: '☁️', title: 'Himmelsstürmerin', unit: 'Meter mit Issa erklettert', thresholds: [200, 500, 1000, 2000], bereich: 'bestleistung' }
    ];

    /* Bestleistungen, die zusätzlich eine Trophäe tragen. Die Tabelle sagt,
       WO der Wert steht - damit recordBest() und getAchievementOverview()
       dieselbe Quelle lesen und nicht auseinanderlaufen. */
    const BEST_ACHIEVEMENTS = [
        { achievement: 'hoehe', gameId: 'issajump', best: 'hoehe' }
    ];

    // Schwellwerte für alle Kategorie-spezifischen Achievements (Wortarten in
    // Circus Maximus, Kasus/Tempora/Modi im Formen-Kastell)
    const CATEGORY_THRESHOLDS = [10, 25, 50, 100];

    // Anzeige-Label + Icon pro Kategorie-Schlüssel. Neue Kategorien können hier
    // einfach ergänzt werden, sobald ein Spiel sie über recordCategoryAttempt meldet.
    const CATEGORY_META = {
        'Substantiv': { icon: '📜', label: 'Substantive' },
        'Verb': { icon: '⚡', label: 'Verben' },
        'Adjektiv': { icon: '🎨', label: 'Adjektive' },
        'Nominativ': { icon: '①', label: 'Nominativ' },
        'Genitiv': { icon: '②', label: 'Genitiv' },
        'Dativ': { icon: '③', label: 'Dativ' },
        'Akkusativ': { icon: '④', label: 'Akkusativ' },
        'Ablativ': { icon: '⑤', label: 'Ablativ' },
        'Präsens': { icon: '🕐', label: 'Präsens' },
        'Imperfekt': { icon: '⏳', label: 'Imperfekt' },
        'FuturI': { icon: '🔮', label: 'Futur I' },
        'Perfekt': { icon: '✅', label: 'Perfekt' },
        'Plusquamperfekt': { icon: '📯', label: 'Plusquamperfekt' },
        'Passiv': { icon: '🔄', label: 'Passiv' },
        'Imperativ': { icon: '📢', label: 'Imperativ' },
        'Konjunktiv': { icon: '💭', label: 'Konjunktiv' },
        'Infinitiv': { icon: '➰', label: 'Infinitiv' },
        'PPA': { icon: '🏃', label: 'PPA' },
        'Gerundium': { icon: '📝', label: 'Gerundium/Gerundivum' },

        // Satzglieder (Via Rōmāna, Pendel)
        'Subjekt': { icon: '🧍', label: 'Subjekt' },
        'Prädikat': { icon: '⚙️', label: 'Prädikat' },
        'Akkusativobjekt': { icon: '🎯', label: 'Akkusativobjekt' },
        'Dativobjekt': { icon: '🎁', label: 'Dativobjekt' },
        'Genitiv-Attribut': { icon: '🔗', label: 'Genitiv-Attribut' },
        'Handlungsträger': { icon: '🎭', label: 'Handlungsträger' },
        'Adverbiale': { icon: '🧭', label: 'Adverbiale Bestimmung' },

        // Formenlehre jenseits der Kasus/Tempora (Villa, Pronomina, Principia, Duell)
        'KNG-Kongruenz': { icon: '🧩', label: 'KNG-Kongruenz' },
        'Personalpronomen': { icon: '👤', label: 'Personalpronomen' },
        'Possessivpronomen': { icon: '👝', label: 'Possessivpronomen' },
        'Demonstrativpronomen': { icon: '👉', label: 'Demonstrativpronomen' },
        'Relativpronomen': { icon: '🔀', label: 'Relativpronomen' },
        'Grundformen': { icon: '🪙', label: 'Grundformen' },
        'Wortartklassen': { icon: '🗂️', label: 'Deklinations-/Konjugationsklassen' },

        // Satzwertige Konstruktionen (Arcus)
        'Subjektsakkusativ': { icon: '🏛️', label: 'Subjektsakkusativ' },
        'AcI-Infinitiv': { icon: '🪧', label: 'Infinitiv im AcI' },
        'Zeitverhältnis': { icon: '⏱️', label: 'Zeitverhältnis' }
    };

    function _todayString() {
        return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    }

    /** Ermittelt für einen Wert und eine Schwellwert-Liste die erreichte Stufe (0-4). */
    function _tierForValue(value, thresholds) {
        let tier = 0;
        for (let i = 0; i < thresholds.length; i++) {
            if (value >= thresholds[i]) tier = i + 1;
        }
        return tier;
    }

    /**
     * Prüft, ob sich die Stufe eines Achievements gegenüber dem zuletzt als
     * "gezeigt" vermerkten Stand erhöht hat. Falls ja, wird der neue Stand
     * vermerkt und das Achievement als frisch freigeschaltet zurückgegeben.
     */
    function _checkUnlock(data, achievementId, currentValue, thresholds, meta) {
        const newTier = _tierForValue(currentValue, thresholds);
        const prevTier = data.achievements.unlockedTiers[achievementId] || 0;
        if (newTier > prevTier) {
            data.achievements.unlockedTiers[achievementId] = newTier;
            return { id: achievementId, tier: newTier, tierName: TIER_NAMES[newTier - 1], threshold: thresholds[newTier - 1], ...meta };
        }
        return null;
    }

    /**
     * Kategorie-spezifischen Versuch protokollieren (z.B. "Imperativ", "Substantiv").
     * Zählt NUR den Kategorie-Fortschritt - Serie/Gesamtzahl/Tage laufen bereits
     * über recordVocabAttempt(), das jedes Spiel ohnehin schon aufruft.
     * Rückgabe: neu freigeschaltetes Achievement-Objekt, oder null.
     */
    function recordCategoryAttempt(category, correct) {
        const data = _load();
        if (!data.achievements.categories[category]) {
            data.achievements.categories[category] = { correct: 0, total: 0 };
        }
        const entry = data.achievements.categories[category];
        entry.total++;
        if (correct) entry.correct++;

        const meta = CATEGORY_META[category] || { icon: '🏅', label: category };
        const unlock = correct
            ? _checkUnlock(data, 'cat_' + category, entry.correct, CATEGORY_THRESHOLDS, {
                icon: meta.icon, title: meta.label, unit: `${meta.label} richtig beantwortet`
            })
            : null;
        _save(data);
        return unlock;
    }

    /**
     * Liefert den vollständigen Achievement-Status für die Übersichtsseite:
     * alle 4 festen Achievements + alle bisher gemeldeten Kategorien, jeweils
     * mit aktuellem Wert, erreichter Stufe (0-4) und Fortschritt zur nächsten Stufe.
     */
    function getAchievementOverview() {
        const data = _load();
        const a = data.achievements;
        const greenCount = Object.values(data.vocab).filter(v => (v.box || 0) >= MAX_BOX).length;

        const fixedValues = {
            streak: a.streakBest,
            total: a.totalAnswered,
            mastery: greenCount,
            days: (a.daysPlayed || []).length
        };
        // Dieselbe Quelle wie recordBest() - siehe BEST_ACHIEVEMENTS.
        BEST_ACHIEVEMENTS.forEach(b => {
            const spiel = data.games[b.gameId];
            fixedValues[b.achievement] = (spiel && spiel.bests && spiel.bests[b.best]) || 0;
        });

        const result = FIXED_ACHIEVEMENTS.map(def => {
            const value = fixedValues[def.id];
            const tier = _tierForValue(value, def.thresholds);
            const nextThreshold = def.thresholds[tier] || null;
            return { ...def, value, tier, nextThreshold };
        });

        Object.keys(a.categories).forEach(cat => {
            const meta = CATEGORY_META[cat] || { icon: '🏅', label: cat };
            const value = a.categories[cat].correct;
            const tier = _tierForValue(value, CATEGORY_THRESHOLDS);
            const nextThreshold = CATEGORY_THRESHOLDS[tier] || null;
            result.push({
                id: 'cat_' + cat, icon: meta.icon, title: meta.label,
                unit: `${meta.label} richtig beantwortet`,
                thresholds: CATEGORY_THRESHOLDS, value, tier, nextThreshold,
                bereich: 'kategorie'
            });
        });

        return result;
    }

    function getTotalUnlockedCount() {
        return getAchievementOverview().reduce((sum, a) => sum + a.tier, 0);
    }

    return {
        saveGameResult,
        recordBest,
        getBest,
        getGameProgress,
        getAllProgress,
        recordVocabAttempt,
        getBoxLevel,
        getColorIndex,
        getBoxColor,
        weightedPick,
        resetPickMemory,
        getBoxSummary,
        getWeakVocab,
        resetProgress,
        recordCategoryAttempt,
        getAchievementOverview,
        getTotalUnlockedCount,
        FIXED_ACHIEVEMENTS,
        CATEGORY_THRESHOLDS,
        TIER_NAMES
    };
})();
