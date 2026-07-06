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

    /**
     * Einzelnen Vokabel-Versuch protokollieren (unabhängig vom Spiel).
     * Damit lässt sich später klassenweit sehen, welche Wörter noch wackelig sitzen.
     */
    function recordVocabAttempt(latinWord, correct) {
        const data = _load();
        if (!data.vocab[latinWord]) {
            data.vocab[latinWord] = { correct: 0, wrong: 0 };
        }
        if (correct) {
            data.vocab[latinWord].correct++;
        } else {
            data.vocab[latinWord].wrong++;
        }
        _save(data);
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
        getWeakVocab,
        resetProgress
    };
})();
