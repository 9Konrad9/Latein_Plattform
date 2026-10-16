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

    return { sinne, kern, kernSinne, kollidiert, waehleDistraktoren, fuer };
})();

// Auch unter Node erreichbar, damit die Tests es ohne Browser prüfen können.
if (typeof module !== 'undefined' && module.exports) module.exports = LudiBedeutung;
