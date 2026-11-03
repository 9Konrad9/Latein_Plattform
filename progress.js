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
                    zaehler: {},      // aufsummierte Marken (wiederholt, lernzeiten, quartette)
                    unlockedTiers: {} // z.B. { 'streak': 2, 'cat_Imperativ': 1 } - höchste bereits gezeigte Stufe (0=keine)
                };
            }
            /* Altbestand ohne das Fach absichern - wer vor November 2026
               gespielt hat, hat keinen `zaehler`-Zweig im Speicher. */
            if (!data.achievements.zaehler) data.achievements.zaehler = {};
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

    /**
     * Eine Marke, die sich AUFSUMMIERT - anders als recordBest, das nur das
     * Beste behält, und anders als recordVocabAttempt, das ein einzelnes Wort
     * führt. Gebraucht von den drei Trophäen, die etwas zählen, das über
     * Runden hinweg wächst: nachgearbeitete Vokabeln, abgeschlossene
     * Vokabelzeiten, abgelegte Quartette.
     *
     * Der Name IST die Trophäen-Kennung. Absicht: recordBest braucht dafür
     * eine zweite Tabelle (BEST_ACHIEVEMENTS), und genau die war schon
     * einmal die Stelle, an der eine Trophäe nie gefunden wurde. Hier gibt
     * es nichts, was auseinanderlaufen könnte.
     *
     * Rückgabe: das neu freigeschaltete Achievement, oder null.
     */
    function recordCount(name, delta) {
        const data = _load();
        const z = data.achievements.zaehler;
        z[name] = (z[name] || 0) + (delta || 1);
        const def = FIXED_ACHIEVEMENTS.find(f => f.id === name);
        const unlock = def
            ? _checkUnlock(data, def.id, z[name], def.thresholds,
                           { icon: def.icon, title: def.title, unit: def.unit })
            : null;
        _save(data);
        return unlock;
    }

    function getCount(name) {
        return _load().achievements.zaehler[name] || 0;
    }

    /** Wie viele der zwölf Spiele hat dieses Gerät schon gespielt? */
    function _breite(data) {
        return SPIEL_GRUPPEN.filter(gruppe => gruppe.some(id => data.games[id])).length;
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
        /* „Weitgereist" hängt an `games`, nicht an dieser Antwort - geprüft
           wird es trotzdem hier, weil saveGameResult() seinen Rückgabewert
           nirgends auswertet und ein dreizehnter Aufrufer dafür zu viel wäre.
           Folge, die man kennen muss: Die Stufe erscheint erst bei der ersten
           ANTWORT nach dem neuen Spiel, nicht schon beim Speichern. */
        const def5 = FIXED_ACHIEVEMENTS.find(f => f.id === 'breite');
        const u5 = _checkUnlock(data, 'breite', _breite(data), def5.thresholds,
                                { icon: def5.icon, title: def5.title, unit: def5.unit });
        [u1, u2, u3, u4, u5].forEach(u => { if (u) unlocks.push(u); });

        _save(data);
        /* NACH dem Speichern: Die Ehrentitel rechnen über die ganze
           Übersicht und lesen dafür frisch aus dem Speicher - mittendrin
           sähen sie den Stand von vor dieser Antwort. */
        _titelPruefen().forEach(t => unlocks.push(t));
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

    /* SIEBEN STUFEN seit November 2026, gewünscht von den Schüler:innen: Viele
       standen auf mehreren Trophäen schon auf Diamant und hatten nichts mehr
       vor sich.

       Die ersten vier bleiben Materialien, die drei neuen sind römische EHREN,
       und zwar in der Reihenfolge, in der Rom sie vergab: der Lorbeerkranz
       (laurea) für einen Sieg, die purpurne toga picta, die nur der
       Triumphator trug, und zuletzt der Triumphzug selbst - die seltenste
       Auszeichnung, die der Senat zu vergeben hatte. Ab Diamant geht es also
       nicht mehr um Material, sondern um Ehre; das lässt sich einer Klasse in
       einem Satz erklären.

       DIE REGEL, AN DER ALLES HÄNGT: JEDE LEITER IST SO LANG, WIE DIE SACHE
       SIE TRÄGT. Sieben Stufen gibt es nur, wo die Zahl nach oben offen ist.
       Wo eine Decke steht - der Wortschatz hat 998 Wörter, Scrīniums Pult
       läuft irgendwann voll -, hört die Leiter früher auf, und ihre oberste
       Stufe heißt dann eben Diamant, Lorbeer oder Purpur. Eine Stufe, die
       niemand erreichen kann, ist keine Stufe, sondern ein gebrochenes
       Versprechen; `test-achievements.js` rechnet jede Decke nach.

       UND: DIE UNTEREN SPROSSEN SIND NACH UNTEN GERÜCKT, nie nach oben. Wer
       heute Diamant hat, darf durch das Update keine Stufe verlieren - ein
       Abstieg wäre genau das Gegenteil dessen, was gewünscht war. Geprüft
       wird das als Invariante: Für jede Trophäe und jeden Wert muss die neue
       Stufe mindestens so hoch sein wie die alte. */
    const TIER_NAMES = ['Bronze', 'Silber', 'Gold', 'Diamant', 'Lorbeer', 'Purpur', 'Triumphus'];

    // Die festen Achievements. Die ersten vier sind spielübergreifend und
    // hängen an recordVocabAttempt; das fünfte gehört zu EINEM Spiel und hängt
    // an einer Bestleistung (siehe BEST_ACHIEVEMENTS darunter).
    // Die Indizes 0 bis 3 werden weiter oben einzeln angesprochen - neue
    // Einträge deshalb HINTEN anhängen.
    const FIXED_ACHIEVEMENTS = [
        { id: 'streak', icon: '🔥', title: 'Serien-Meister', unit: 'Fragen in Folge richtig', thresholds: [5, 10, 20, 35, 50, 75, 100], bereich: 'allgemein' },
        /* 6000 statt 2500 ganz oben: Eine Vokabelzeit von zehn Minuten bringt
           gemessen rund 40 Fragen (vier Spiele à 8-13). Zweimal die Woche über
           ein Schuljahr sind das gut 3000 - der Triumphus liegt also bei etwa
           zwei Jahren regelmäßigen Übens. Weiter oben wäre er bis zum Abitur
           nicht zu holen. */
        { id: 'total', icon: '📚', title: 'Fleißiges Bienchen', unit: 'Fragen insgesamt beantwortet', thresholds: [100, 300, 700, 1500, 2500, 4000, 6000], bereich: 'allgemein' },
        /* SECHS Stufen, nicht sieben: Der Wortschatz hat 998 Wörter, und für
           Grün braucht jedes VIER Treffer in Folge. Die alte Höchststufe von
           900 sind schon 90 % davon - darüber ist keine Stufe mehr, sondern
           eine Mauer. Die neuen Sprossen liegen deshalb alle DARUNTER. */
        { id: 'mastery', icon: '🟢', title: 'Vokabel-Meisterschaft', unit: 'Vokabeln auf Grün', thresholds: [25, 100, 250, 500, 700, 900], bereich: 'allgemein' },
        { id: 'days', icon: '📅', title: 'Beständigkeit', unit: 'verschiedene Tage gespielt', thresholds: [2, 5, 10, 20, 40, 70, 100], bereich: 'allgemein' },
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
        { id: 'hoehe', icon: '☁️', title: 'Himmelsstürmerin', unit: 'Meter mit Issa erklettert', thresholds: [150, 350, 700, 1200, 2000, 3000, 4000], bereich: 'bestleistung' },

        /* Scrīnium. Die Schwellen sind aus der Taktsimulation abgeleitet
           (latein-tests/probe-takt.js), nicht geschätzt: Gegen fünf Tempi von
           1,5 bis 6,5 Sekunden je Rolle kommen 56 / 47 / 40 / 27 / 18 Rollen
           heraus. Die unterste Stufe soll also fast jede erreichen, die
           oberste über der schnellsten simulierten Spielerin liegen. */
        /* FÜNF Stufen, und die oberste bei 50 statt 60. Beim Nachrechnen für
           die neuen Stufen kam heraus: Der alte Diamant war NICHT ERREICHBAR.
           Mit den heutigen Taktzahlen (7000 → 1100 ms, Faktor 0,96, sechs
           Plätze) kommt selbst die schnellste gerechnete Spielerin - 1,5
           Sekunden je Rolle - auf 56 Rollen. Die Stufe stand also über dem,
           was die Mechanik hergibt, und niemand ist dort je angekommen.
           Die Erweiterung und die Reparatur sind hier dieselbe Änderung. */
        { id: 'rollen', icon: '📜', title: 'Archivmeister', unit: 'Rollen in einer Runde einsortiert', thresholds: [10, 20, 30, 40, 50], bereich: 'bestleistung' },

        /* Zehn Fächer statt fünf: Die Entscheidung dauert länger (gerechnet
           35 % mehr Zeit je Rolle), die Decke liegt deshalb bei 45 - genau
           dort, wo die alte Höchststufe stand. Auch sie war also nur für die
           allerschnellste Spielerin zu holen. */
        { id: 'rollen-numerus', icon: '🗂️', title: 'Tabellenfest', unit: 'Rollen mit Numerus einsortiert', thresholds: [8, 15, 24, 32, 40], bereich: 'bestleistung' },

        /* Die eigentliche Lernmarke dieses Spiels. Gemessen sind 32 % aller
           Nomenformen mehrdeutig (patribus = Dat. UND Abl.), in einer Runde
           von 40 Rollen also rund 13. Wer die sicher wegräumt, hat begriffen,
           dass eine Endung mehr als einen Fall tragen kann - und DAS ist der
           Grund, warum das Spiel mehrdeutige Formen nicht aussortiert. */
        /* Dieselbe Geschichte zum dritten Mal: 24 mehrdeutige Formen bräuchten
           rund 75 Rollen (32 % aller Nomenformen sind mehrdeutig), und bei 56
           ist Schluss. Die Decke liegt also bei 18; die Höchststufe steht
           jetzt bei 16, und Diamant bei 13 - das ist eine gute Runde von 40
           Rollen. */
        { id: 'doppelformen', icon: '👀', title: 'Doppelblick', unit: 'mehrdeutige Formen in einer Runde richtig eingeordnet', thresholds: [3, 6, 10, 13, 16], bereich: 'bestleistung' },

        /* ---------- Vier neue Trophäen (November 2026) ----------
           Alle vier zählen etwas AUF, was es im Projekt schon gibt, und
           hängen deshalb an genau einer neuen Stelle statt an zehn.
           `quelle` sagt, wo ihr Wert herkommt - dieselbe Idee wie `bereich`:
           Die Trophäe beschreibt sich selbst, statt dass eine zweite Liste
           anderswo dasselbe noch einmal behauptet. */

        /* Die Breite. Belohnt genau das, was auch die Vokabelzeit will: nicht
           nur Issa. Sie kostet KEINE neue Zählstelle - welche Spiele jemand
           gespielt hat, steht längst in `games`.

           DIE HÖCHSTSTUFE STEHT BEI 11, NICHT BEI 12, obwohl SPIEL_GRUPPEN
           zwölf Gruppen führt: Quaternio ist seit November 2026 stillgelegt
           und hat keine Karte im Hauptmenü mehr. Eine Klasse findet also nur
           elf Spiele, und eine Stufe, die man nicht erreichen kann, sieht aus
           wie eine, die man noch nicht erreicht hat - dieselbe Falle wie bei
           Archivmeister und Doppelblick. Quaternio BLEIBT in der Gruppenliste:
           Wer es gespielt hat, behält es (und wer den Link kennt, kommt weiter
           hinein). Die Zahl heruntergesetzt statt die Gruppe gestrichen, denn
           eine gestrichene Gruppe hätte jemandem mit elf Spielen eine Stufe
           WEGGENOMMEN - genau das, was beim Umbau auf sieben Stufen nicht
           passieren durfte. Die drei oberen Sprossen sind dafür um eins
           heruntergerückt (10/11/12 auf 9/10/11), nie nach oben - sonst
           verlöre jemand eine Stufe. Beim Wiedereinschalten: zurück auf
           [2, 4, 6, 8, 10, 11, 12]. */
        { id: 'breite', icon: '🧭', title: 'Weitgereist', unit: 'verschiedene Spiele gespielt',
          thresholds: [2, 4, 6, 8, 9, 10, 11], bereich: 'allgemein', quelle: 'breite' },

        /* Die Wiederholungsrunde. Der Fachlehrer hat schon entschieden, dass
           die Zähler dort WEITERLAUFEN, während der Vokabelkasten ruht:
           "Die Trophäen zählen Fleiß, und wer seine Fehler nochmal durchgeht,
           hat den Fleiß aufgebracht." Das hier ist die Trophäe dazu. */
        { id: 'wiederholt', icon: '🔁', title: 'Hartnäckig', unit: 'Vokabeln in der Wiederholung nachgearbeitet',
          thresholds: [10, 25, 50, 100, 200, 350, 600], bereich: 'allgemein', quelle: 'zaehler' },

        /* Die Vokabelzeit - das neue Format hatte noch gar keine Marke.
           Gezählt wird nur, was BIS ZUM ENDE gespielt wurde. */
        { id: 'lernzeiten', icon: '⏱️', title: 'Stammgast', unit: 'Vokabelzeiten abgeschlossen',
          thresholds: [1, 3, 7, 15, 30, 55, 90], bereich: 'allgemein', quelle: 'zaehler' },

        /* Quaternio. Höchstens sechs Quartette je Partie, die Leiter zählt
           deshalb über alle Partien. */
        { id: 'quartette', icon: '🃏', title: 'Kartensammler', unit: 'Quartette abgelegt',
          thresholds: [5, 15, 30, 60, 110, 200, 350], bereich: 'allgemein', quelle: 'zaehler' }
    ];

    /* ---------- DIE EHRENTITEL (November 2026) ----------
       Eine zweite ART von Auszeichnung neben den Leitern, auf Vorschlag des
       Fachlehrers: Ein Titel wird nicht für eine Menge vergeben, sondern für
       den Besitz MEHRERER Trophäen - er krönt die Sammlung, statt sie zu
       verlängern. In Rom war das genauso: `pater patriae` war kein Orden für
       eine Tat, sondern für eine Laufbahn.

       WARUM SIE KEINE TROPHÄEN MIT EIN-STUFEN-LEITER SIND: Dann zählte jeder
       Titel in „X von Y Stufen freigeschaltet" mit und verwässerte genau die
       Zahl, die er krönen soll. `getAchievementOverview()` liefert deshalb
       weiter NUR Leiter-Trophäen; die Titel kommen aus `getEhrentitel()`.

       SIE KOSTEN KEINE EINZIGE NEUE ZÄHLSTELLE. Alles, was ein Titel wissen
       muss, steht schon in der Übersicht.

       DIE SCHWELLEN SIND GEMESSEN, nicht geschätzt (probe-titel.js, echtes
       progress.js mit simuliertem Spielverhalten). Eine Sammlung wächst so:

         Trefferquote 80 %   Trophäen  >=Gold  >=Diamant  >=Lorbeer  >=Purpur  Triumphus
         ein halbes Jahr          28      10          8          4         3          1
         ein Schuljahr            39      29         11          9         4          3
         zwei Jahre               43      42         33         16        10          7

       Daran hängen die Zahlen unten. „Bronze" taugt dabei NICHT als
       Bedingung: Jede Trophäe, die man überhaupt berührt, steht sofort
       darauf - das wäre eine verkappte Breiten-Zählung, und die gibt es mit
       „Weitgereist" schon.

       UND EIN BEABSICHTIGTER NEBENEFFEKT: Die Titel verlangen BREITE. Wer nur
       ein Spiel spielt, hat höchstens fünfzehn Trophäen und erreicht „20 auf
       Gold" nie - egal wie gut er ist. Das ist gewollt und derselbe Gedanke
       wie bei der Vokabelzeit.

       `stufe` ist die Stufennummer (1 = Bronze ... 7 = Triumphus). */
    const EHRENTITEL = [
        { id: 'civica', icon: '🌿', titel: 'Corōna cīvica',
          rom: 'Die Bürgerkrone aus Eichenlaub — in Rom für die Rettung eines Mitbürgers. ' +
               'Jedem Soldaten zugänglich und höher geachtet als mancher Orden der Feldherren.',
          bedingungen: [{ stufe: 2, anzahl: 15 }] },

        { id: 'primuspilus', icon: '🎖️', titel: 'Prīmus pīlus',
          rom: 'Der erste Centurio der Legion: der höchste Rang, den ein einfacher Soldat ' +
               'allein durch Verdienst erreichen konnte.',
          bedingungen: [{ stufe: 3, anzahl: 20 }] },

        { id: 'muralis', icon: '🧱', titel: 'Corōna mūrālis',
          rom: 'Die Mauerkrone — für den, der als Erster die Mauer der feindlichen Stadt ' +
               'erstieg.',
          bedingungen: [{ stufe: 5, anzahl: 5 }] },

        { id: 'imperator', icon: '🦅', titel: 'Imperātor',
          rom: 'Nach einem großen Sieg rief das Heer seinen Feldherrn so aus — der Titel kam ' +
               'nicht von oben, sondern von den eigenen Leuten.',
          bedingungen: [{ stufe: 6, anzahl: 3 }] },

        /* Der einzige mit ZWEI Bedingungen, und das mit Absicht: Rom verlieh
           ihn für Höhe UND Breite einer Laufbahn, nicht für eine Spitze. */
        { id: 'paterpatriae', icon: '🏛️', titel: 'Pater patriae',
          rom: 'Vater des Vaterlandes — Cicero bekam ihn nach der Catilinarischen ' +
               'Verschwörung, Augustus im Jahr 2 v. Chr. Die Krone einer ganzen Laufbahn.',
          bedingungen: [{ stufe: 7, anzahl: 3 }, { stufe: 3, anzahl: 30 }] }
    ];

    /* Welche Spiele für „Weitgereist" zählen - und warum als Gruppen:
       Pronomina! speichert seine vier Modi unter vier Kennungen, ist aber EIN
       Spiel. Wer hier stumpf die Schlüssel in `games` zählte, käme bei vier
       Pronomina-Runden auf vier Spiele.
       Draußen bleiben die Gruppenspiele (Fliegenklatsche, Bingo, Bomba,
       Memoria) - sie speichern bewusst kein Ergebnis, weil die Leistung der
       Klasse gehört und nicht dem Gerät. Und das Duell: Es bedient zwar
       Vokabelkasten und Kategorien, speichert aber kein Ergebnis - siehe den
       offenen Punkt in CLAUDE.md. `test-achievements.js` prüft, dass diese
       Liste genau die Kennungen abdeckt, die die Spiele wirklich speichern. */
    const SPIEL_GRUPPEN = [
        ['circus'], ['principia'], ['issajump'], ['kastell'], ['scrinium'], ['villa'],
        ['personalpronomen', 'possessiv', 'demonstrativpronomen', 'relativpronomen'],
        ['viaromana'], ['pendel'], ['arcus'], ['quartett'], ['quiz']
    ];

    /* Bestleistungen, die zusätzlich eine Trophäe tragen. Die Tabelle sagt,
       WO der Wert steht - damit recordBest() und getAchievementOverview()
       dieselbe Quelle lesen und nicht auseinanderlaufen. */
    const BEST_ACHIEVEMENTS = [
        { achievement: 'hoehe', gameId: 'issajump', best: 'hoehe' },
        { achievement: 'rollen', gameId: 'scrinium', best: 'rollen' },
        { achievement: 'rollen-numerus', gameId: 'scrinium', best: 'rollen-numerus' },
        { achievement: 'doppelformen', gameId: 'scrinium', best: 'doppelformen' }
    ];

    // Schwellwerte für alle Kategorie-spezifischen Achievements (Wortarten in
    // Circus Maximus, Kasus/Tempora/Modi im Formen-Kastell)
    /* Auch hier sieben Stufen, und die unteren nach unten gerückt. EINE
       Leiter für rund vierzig Kategorien heißt zwangsläufig: In den häufigen
       (Substantiv, Verb, Präsens) ist der Triumphus zu holen, in den seltenen
       (Gerundium, Konjunktiv) nicht. Das war schon bei vier Stufen so - 100
       richtige Gerundium-Formen sind ebenso unerreichbar - und je Kategorie
       eigene Schwellen wären vierzig Entscheidungen statt einer. */
    const CATEGORY_THRESHOLDS = [5, 15, 30, 60, 110, 200, 350];

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
        'Zeitverhältnis': { icon: '⏱️', label: 'Zeitverhältnis' },

        // Wortfelder (Quaternio) - die thematische Achse `thema` an den Nomen,
        // nicht `feld`: Hier geht es darum, WOVON ein Wort handelt.
        'Wortfeld': { icon: '🗃️', label: 'Wortfeld eines Nomens' },

        // Partizipialkonstruktionen (Arcus, ab L18)
        'Partizip': { icon: '🧱', label: 'Partizip finden' },
        'Bezugswort': { icon: '🪢', label: 'Bezugswort des Partizips' },
        'Partizipialkonstruktion': { icon: '⚖️', label: 'PC oder Abl. abs.?' }
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
            days: (a.daysPlayed || []).length,
            breite: _breite(data)
        };
        /* Die aufsummierten Marken sagen selbst, wo ihr Wert steht
           (`quelle: 'zaehler'`), statt dass hier eine zweite Liste dieselben
           Kennungen noch einmal aufzählt. */
        FIXED_ACHIEVEMENTS.filter(f => f.quelle === 'zaehler')
            .forEach(f => { fixedValues[f.id] = (a.zaehler || {})[f.id] || 0; });
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

    /**
     * Die Ehrentitel: was jeder verlangt, wie weit man ist, und ob er
     * verliehen ist. Gerechnet wird aus der Übersicht - ein Titel hat keinen
     * eigenen Speicher.
     *
     * Jede Bedingung bekommt ihren eigenen Stand mit, damit die Karte
     * „29 von 30 Trophäen auf Gold oder höher" zeigen kann. Ein Titel ohne
     * sichtbaren Weg dorthin ist nur eine Ente - und bei Pater patriae mit
     * seinen ZWEI Bedingungen wäre gar nicht zu erraten, woran es hakt.
     */
    function getEhrentitel() {
        const overview = getAchievementOverview();
        const beiStufe = s => overview.filter(a => a.tier >= s).length;
        return EHRENTITEL.map(t => {
            const bedingungen = t.bedingungen.map(b => ({
                stufe: b.stufe, stufenName: TIER_NAMES[b.stufe - 1],
                anzahl: b.anzahl, wert: beiStufe(b.stufe)
            }));
            return {
                id: t.id, icon: t.icon, titel: t.titel, rom: t.rom,
                bedingungen: bedingungen,
                verliehen: bedingungen.every(b => b.wert >= b.anzahl),
                /* Der Anteil über ALLE Bedingungen zusammen - bei einer ist
                   es ihr eigener, bei zweien der Mittelwert. */
                anteil: Math.round(100 * bedingungen.reduce(
                    (s, b) => s + Math.min(1, b.wert / b.anzahl), 0) / bedingungen.length)
            };
        });
    }

    /* Frisch verliehene Titel melden - nach demselben Muster wie die Stufen:
       `unlockedTiers` merkt sich, was schon gefeiert wurde.
       AUFGERUFEN WIRD DAS ERST NACH DEM SPEICHERN, nicht mittendrin: Der
       Titel rechnet über getAchievementOverview(), und das liest frisch aus
       dem Speicher. Mitten in recordVocabAttempt sähe es noch den Stand von
       vor dieser Antwort, und der Titel käme eine Frage zu spät. */
    function _titelPruefen() {
        const neue = [];
        const titel = getEhrentitel();
        const data = _load();
        let geaendert = false;
        titel.forEach(t => {
            const kennung = 'titel_' + t.id;
            if (t.verliehen && !data.achievements.unlockedTiers[kennung]) {
                data.achievements.unlockedTiers[kennung] = 1;
                geaendert = true;
                neue.push({ id: kennung, icon: t.icon, title: t.titel, tier: 1,
                            tierName: 'Ehrentitel', unit: 'verliehen',
                            threshold: null, ehrentitel: true });
            }
        });
        if (geaendert) _save(data);
        return neue;
    }

    /**
     * „X von Y Stufen freigeschaltet" - beide Zahlen aus EINER Quelle.
     *
     * Vorher rechneten das Hauptmenü und die Trophäenseite jeweils
     * `overview.length * 4`, also zweimal dieselbe feste Vier. Seit die
     * Leitern verschieden lang sind (sieben Stufen, wo es nach oben offen
     * ist, weniger unter einer Decke), wäre das schlicht falsch - und zwar
     * an zwei Stellen gleichzeitig.
     */
    function getTierSummary() {
        const overview = getAchievementOverview();
        return {
            freigeschaltet: overview.reduce((s, a) => s + a.tier, 0),
            moeglich: overview.reduce((s, a) => s + a.thresholds.length, 0)
        };
    }

    return {
        saveGameResult,
        recordBest,
        getBest,
        recordCount,
        getCount,
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
        getTierSummary,
        SPIEL_GRUPPEN,
        getEhrentitel,
        EHRENTITEL,
        FIXED_ACHIEVEMENTS,
        CATEGORY_THRESHOLDS,
        TIER_NAMES
    };
})();
