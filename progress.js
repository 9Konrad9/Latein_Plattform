// progress.js
// Zentrale Fortschritts-Speicherung für Lūdī Rōmānī.
// Nutzt localStorage — funktioniert offline, pro Gerät/Browser, ohne Server.
// Einbinden per <script src="progress.js"></script> VOR dem jeweiligen Spiel-Script.

const LudiProgress = (() => {
    const STORAGE_KEY = 'ludiRomani_progress_v1';

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : { games: {}, vocab: {} };
        } catch (e) {
            console.warn('Fortschritt konnte nicht geladen werden:', e);
            return { games: {}, vocab: {} };
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
        _save(data);
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
        resetProgress
    };
})();
