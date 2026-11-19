// bedeutung.js
// Teilt die Bedeutungsangabe eines Vokabeleintrags in ihre einzelnen SINNE auf
// und sagt, ob zwei Einträge sich einen davon teilen.
//
// Einbinden per <script src="bedeutung.js"></script> NACH vocabulary.js.
//
// WOZU DAS DA IST
// ---------------
// Die Bedeutungsspiele (Issa springt, Circus Maximus, Duell) ziehen ihre
// falschen Antworten aus anderen Wörtern desselben Topfes. Geprüft wurde dabei
// nur, ob der Text GLEICH ist - nicht, ob er dasselbe BEDEUTET. Ergebnis:
//
//     canere  „ertönen, singen, spielen"
//     richtig laut Spiel: „ertönen"
//     als falsch gewertet: „singen"   (aus cantāre)
//
// Wer weiß, dass canere „singen" heißt, antwortet richtig und bekommt „falsch".
// Aus dem Unterricht gemeldet (Oktober 2026), und es ist der ärgerlichste
// Fehler überhaupt, weil er nicht zu erklären ist.
//
// Gemessen: 17 % der Wörter bis L12 haben im eigenen Topf mindestens einen
// solchen Doppelgänger, bis L35 sind es 27 % - darunter clāmāre, vidēre,
// agere, manēre, quaerere, also keine Randerscheinungen.
//
// Je Runde trifft es nur 0,2 bis 0,8 %. Das klingt wenig, ist es aber nicht:
// Der Leitner-Kasten schiebt ein zu Unrecht als falsch gewertetes Wort auf Rot,
// und rote Wörter kommen HÄUFIGER dran. Für das betroffene Wort wird daraus
// eine Schleife, die sich selbst am Laufen hält.
const LudiBedeutung = (() => {

    /* Trennzeichen sind Komma und Semikolon; Klammern fliegen raus, weil darin
       die grammatische Beschreibung steht ("(+ Abl.) an etwas leiden") und
       nicht die Bedeutung. */
    function sinne(eintrag) {
        const roh = typeof eintrag === 'string' ? eintrag : (eintrag && eintrag.meaning) || '';
        return String(roh)
            .split(/[,;]/)
            .map(t => t.replace(/\([^)]*\)/g, '').trim())
            .filter(Boolean);
    }

    /* Zum Vergleichen wird eingedampft: Artikel und die üblichen Platzhalter
       weg, Kleinschreibung, nur Buchstaben. „der Sklave" und „Sklave" sind
       dasselbe Wort, und „jmd. rufen" ist „rufen". */
    const FUELLWOERTER = /^(der|die|das|ein|eine|einen|einem|sich|etw\.?|jmd\.?|jemand|jemanden|jemandem|etwas)\s+/;
    function kern(text) {
        let t = String(text).toLowerCase().replace(/[^a-zäöüß ]/g, ' ').replace(/\s+/g, ' ').trim();
        let vorher;
        do { vorher = t; t = t.replace(FUELLWOERTER, ''); } while (t !== vorher);
        return t.trim();
    }

    /* Manche Wörter bedeuten in der LEKTÜRE etwas anderes als im Lehrgang.
       contendere ist im Pontes-Wortschatz „behaupten"; bei Caesar heisst es
       „eilen, marschieren" (BG I 7) und „kämpfen" (BG I 1). Beides in einen
       Eintrag zu schreiben wäre falsch - eine 8. Klasse, die noch keinen
       Caesar liest, soll „behaupten" lernen und sonst nichts.

       Deshalb `meaningAb`: { lesson, meaning }. Ab dieser Stufe gilt die
       andere Angabe. EIN Eintrag je Lemma bleibt damit die Regel - zwei
       Einträge für dasselbe Wort wären genau der Fehler, gegen den diese
       Datei gebaut wurde: In einem Topf, der beide enthält, stünde die eine
       Bedeutung als falsche Antwort auf die andere. */
    function fuer(eintrag, maxLektion) {
        if (!eintrag) return '';
        const ab = eintrag.meaningAb;
        if (ab && typeof maxLektion === 'number' && maxLektion >= ab.lesson) return ab.meaning;
        return eintrag.meaning || '';
    }

    /* Beim Vergleichen zählen BEIDE Angaben. Das ist die vorsichtige
       Richtung: Eine Antwort, die unter einer der beiden Lesarten richtig
       wäre, soll nicht als falsche Antwort danebenstehen. */
    function kernSinne(eintrag) {
        const raus = [];
        const quellen = [eintrag && eintrag.meaning,
                         eintrag && eintrag.meaningAb && eintrag.meaningAb.meaning];
        quellen.filter(Boolean).forEach(q => {
            sinne(q).forEach(s => { const k = kern(s); if (k && raus.indexOf(k) === -1) raus.push(k); });
        });
        if (!quellen.some(Boolean)) sinne(eintrag).forEach(s => { const k = kern(s); if (k) raus.push(k); });
        return raus;
    }

    /**
     * Teilen sich zwei Einträge einen Sinn?
     *
     * Wenn ja, taugt der eine NICHT als falsche Antwort auf den anderen -
     * egal, wie verschieden die beiden Texte aussehen.
     */
    function kollidiert(a, b) {
        const eins = new Set(kernSinne(a));
        if (!eins.size) return false;
        return kernSinne(b).some(s => eins.has(s));
    }

    /**
     * Distraktoren wählen, die mit dem Ziel keinen Sinn teilen.
     *
     * `pool`    - Wortliste, aus der gezogen wird (das Ziel darf drin sein)
     * `anzahl`  - wie viele gebraucht werden
     * `text`    - wie ein Eintrag als Antwort erscheint (Vorgabe: ganze Angabe)
     *
     * Rückgabe: Array der TEXTE, höchstens `anzahl` lang, ohne Dopplungen und
     * ohne den Text des Ziels. Kommen nicht genug zusammen, ist es kürzer -
     * das muss der Aufrufer merken und darf es NICHT mit einer Wiederholung
     * auffüllen. Eine Frage, die sich nicht sauber stellen lässt, wird nicht
     * gestellt.
     */
    function waehleDistraktoren(ziel, pool, anzahl, text) {
        const alsText = text || (v => String(v.meaning || '').trim());
        const zielText = alsText(ziel);
        const gemischt = pool.slice().sort(() => Math.random() - 0.5);

        const raus = [], gesehen = new Set([zielText]);
        for (const kandidat of gemischt) {
            if (raus.length >= anzahl) break;
            if (kandidat === ziel || kandidat.latin === ziel.latin) continue;
            const t = alsText(kandidat);
            if (!t || gesehen.has(t)) continue;
            if (kollidiert(ziel, kandidat)) continue;   // wäre auch richtig
            gesehen.add(t);
            raus.push(t);
        }
        return raus;
    }

    /* ---------- Der Topf mit EINDEUTIGER Bedeutung ----------

       Fuer Spiele, bei denen ein Wort und eine Bedeutung einander
       zugeordnet werden muessen und das Ergebnis NACHPRUEFBAR sein soll:
       Bingo (die Lehrkraft ruft das lateinische Wort auf) und Memory (zwei
       Karten bilden ein Paar oder nicht).

       Ohne diese Siebung steht auf der Karte 'rufen', aufgerufen wird
       'vocāre' - und die Kachel stammte von 'clāmāre'. Beim Nachpruefen
       stuende das falsche Wort da, und niemand koennte entscheiden, wer
       recht hat. Bei Memory waere es dasselbe: zwei Karten, die beide
       passen, aber nicht als Paar gelten.

       Genommen wird die ERSTE Bedeutungsangabe, abgeschnitten vor Komma,
       Semikolon und Klammer: 'arbeiten, sich bemühen; (+ Abl.) an etwas
       leiden' passt auf keine Karte, 'arbeiten' schon. Zu lange Angaben
       (ueber 24 Zeichen) fallen weg - sie passen auf keine Kachel.

       Gemessen kostet die Siebung wenig: bis L12 fallen 42 von 386
       Woertern weg (et/-que/atque fuer 'und', caedere/occidere fuer
       'toeten'), bis L22 sind es 68 von 625.

       Hier und nicht im Spiel, weil es das zweite Spiel braucht - und ein
       drittes kaeme sonst zur dritten Kopie. */
    function eindeutigerTopf(pool) {
        const erste = m => String(m || '').split(/[,;(]/)[0].trim();
        const nach = new Map();
        pool.forEach(v => {
            const b = erste(v.meaning);
            if (!b || b.length > 24) return;
            if (!nach.has(b)) nach.set(b, []);
            nach.get(b).push(v);
        });
        const raus = [];
        nach.forEach((treffer, bedeutung) => {
            if (treffer.length === 1) raus.push({ latin: treffer[0].latin, bedeutung: bedeutung });
        });
        return raus;
    }

    /* ---------- Woher die FALSCHEN Antworten kommen dürfen ----------
       (November 2026, nach einer Rückmeldung aus dem Unterricht:
       "bei Lektion 24 kommen immer nur dieselben Vokabeln")

       Circus und das Duell ziehen ihre Distraktoren ZUERST aus der eigenen
       Wortart - damit die Wortklasse die Lösung nicht verrät. Der Rückfall
       auf den ganzen Topf greift erst, wenn die eigene Wortart keine drei
       hergibt.

       GENAU DAZWISCHEN BRICHT DIE VIELFALT ZUSAMMEN. Lektion 24 hat fünf
       Nomen: Für ein Nomen bleiben vier Kandidaten für drei Plätze, macht
       C(4,3) = VIER mögliche Antwortmengen - und der Rückfall feuert nie,
       weil vier ja für drei reichen. Wer nach `proelium` gefragt wird, sieht
       jedes Mal dieselben Bedeutungen.
       Gemessen betrifft das **244 von 1001 Wörtern (24 %)** bei
       Einzellektions-Auswahl, 154 davon mit höchstens vier möglichen Mengen;
       im schlimmsten Fall gibt es nur EINE (die vier Verben von L15, die
       vier Adjektive von L28, L30, L31 …). Bei einer Lektions-SPANNE tritt
       es nicht auf - und die Einzellektion ist im Unterricht der Normalfall.

       DIE LÖSUNG KAM VOM FACHLEHRER: Die falschen Antworten dürfen aus allem
       kommen, was die Klasse **schon kennt**, nicht nur aus der gewählten
       Lektion. Das hält die Wortart-Reinheit (Nomen gibt es bis L23
       reichlich) und wiederholt nebenbei alten Wortschatz.

       MIT SCHWELLE, NICHT PAUSCHAL ("wenn es nur so wenige Substantive
       gibt"): Hat die Auswahl genug Artgenossen, bleibt alles wie bisher.
       Ab acht gleichartigen Wörtern gibt es C(7,3) = 35 mögliche Mengen -
       genug. Darunter wird geöffnet.
       Das ZIELWORT bleibt davon unberührt: Gefragt wird weiterhin nur, was
       in der gewählten Lektion steht - sonst wäre der Lektionsfilter hin. */
    const VIELFALT_SCHWELLE = 8;

    function bekannteWoerter(auswahl, maxLektion) {
        if (typeof globalVocabularyPool === 'undefined') return auswahl;
        /* `lesson <= maxLektion` ist "bereits bekannt". auchLektionen braucht
           es hier nicht: Ein Wort mit einer Zusatzstufe trägt seine eigene,
           frühere Lektion ohnehin mit sich. */
        const bekannt = globalVocabularyPool.filter(v => v.lesson <= maxLektion);
        return bekannt.length > auswahl.length ? bekannt : auswahl;
    }

    /**
     * Die drei falschen Antworten für eine Bedeutungsfrage - der ganze Weg
     * an EINER Stelle, weil Circus und das Duell ihn sonst doppelt führen
     * und auseinanderlaufen.
     *
     * EIN PLATZ BLEIBT DER GEWÄHLTEN LEKTION RESERVIERT, und das ist nicht
     * kosmetisch: Öffnet man einfach auf alles Bekannte, kommen gemessen nur
     * noch 1-3 % der Distraktoren aus der aktuellen Lektion - die richtige
     * Antwort wäre dann fast immer die EINZIGE, die nicht nach alter Lektion
     * aussieht, und ließe sich durch Wiedererkennen ausschließen, ohne das
     * gefragte Wort zu kennen. Dieselbe Sorgfalt wie beim Kastell, das seine
     * Distraktoren in der GESTALT angleicht.
     */
    function waehleFalsche(ziel, auswahl, maxLektion, anzahl, alsText) {
        const gleichartig = v => v.type === ziel.type;
        const eigene = auswahl.filter(gleichartig);

        /* Genug Artgenossen in der Auswahl? Dann bleibt alles wie bisher. */
        if (eigene.length >= VIELFALT_SCHWELLE) {
            const d = waehleDistraktoren(ziel, eigene, anzahl, alsText);
            return d.length >= anzahl ? d
                 : waehleDistraktoren(ziel, auswahl, anzahl, alsText);
        }

        const bekannt = bekannteWoerter(auswahl, maxLektion);
        if (bekannt === auswahl) {
            const d = waehleDistraktoren(ziel, eigene, anzahl, alsText);
            return d.length >= anzahl ? d
                 : waehleDistraktoren(ziel, auswahl, anzahl, alsText);
        }

        /* Erst der reservierte Platz aus der gewählten Lektion - erst unter
           den Artgenossen, sonst irgendeiner. */
        let gesetzt = waehleDistraktoren(ziel, eigene, 1, alsText);
        if (!gesetzt.length) gesetzt = waehleDistraktoren(ziel, auswahl, 1, alsText);

        /* Dann auffüllen aus allem Bekannten, Wortart zuerst. */
        const dazu = t => gesetzt.indexOf(t) < 0;
        let rest = waehleDistraktoren(ziel, bekannt.filter(gleichartig), anzahl, alsText).filter(dazu);
        let raus = gesetzt.concat(rest).slice(0, anzahl);
        if (raus.length < anzahl) {
            const weiter = waehleDistraktoren(ziel, bekannt, anzahl, alsText)
                .filter(t => raus.indexOf(t) < 0);
            raus = raus.concat(weiter).slice(0, anzahl);
        }
        return raus;
    }

    return { sinne, kern, kernSinne, kollidiert, waehleDistraktoren, fuer,
             eindeutigerTopf, waehleFalsche, bekannteWoerter, VIELFALT_SCHWELLE };
})();

// Auch unter Node erreichbar, damit die Tests es ohne Browser prüfen können.
if (typeof module !== 'undefined' && module.exports) module.exports = LudiBedeutung;
