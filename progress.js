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

        data.games[gameId] = {
            bestScore: prev ? Math.max(prev.bestScore, score) : score,
            maxScore: maxScore,
            lastScore: score,
            lastPlayed: now,
            timesPlayed: (prev ? prev.timesPlayed : 0) + 1
        };
        _save(data);
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

    /**
     * Wählt zufällig ein Element aus dem Pool, gewichtet nach Ampel-Level:
     * niedrigere Stufen erscheinen deutlich häufiger als hohe.
     * pool: Array von Objekten mit einem "latin"-Feld.
     */
    function weightedPick(pool) {
        if (!pool || pool.length === 0) return null;
        const data = _load();
        const boxWeights = [5, 4, 3, 2, 1]; // Stufe 0..4

        const weights = pool.map(item => {
            const entry = data.vocab[item.latin];
            const box = (entry && entry.box !== undefined) ? entry.box : 0;
            return boxWeights[box];
        });

        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < pool.length; i++) {
            r -= weights[i];
            if (r <= 0) return pool[i];
        }
        return pool[pool.length - 1];
    }

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

    // Die 4 festen, spielübergreifenden Achievements
    const FIXED_ACHIEVEMENTS = [
        { id: 'streak', icon: '🔥', title: 'Serien-Meister', unit: 'Fragen in Folge richtig', thresholds: [5, 10, 20, 50] },
        { id: 'total', icon: '📚', title: 'Fleißiges Bienchen', unit: 'Fragen insgesamt beantwortet', thresholds: [100, 500, 1000, 2500] },
        { id: 'mastery', icon: '🟢', title: 'Vokabel-Meisterschaft', unit: 'Vokabeln auf Grün', thresholds: [50, 200, 500, 900] },
        { id: 'days', icon: '📅', title: 'Beständigkeit', unit: 'verschiedene Tage gespielt', thresholds: [3, 7, 14, 30] }
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
        'Gerundium': { icon: '📝', label: 'Gerundium/Gerundivum' }
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
                thresholds: CATEGORY_THRESHOLDS, value, tier, nextThreshold
            });
        });

        return result;
    }

    function getTotalUnlockedCount() {
        return getAchievementOverview().reduce((sum, a) => sum + a.tier, 0);
    }

    return {
        saveGameResult,
        getGameProgress,
        getAllProgress,
        recordVocabAttempt,
        getBoxLevel,
        getColorIndex,
        getBoxColor,
        weightedPick,
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
