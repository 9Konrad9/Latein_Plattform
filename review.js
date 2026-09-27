/* review.js - die Wiederholungsrunde am Rundenende, einmal statt zehnmal.
   Einbinden VOR dem eigenen <script>-Block:
   <script src="review.js"><\/script>

   Von den Schüler:innen gewünscht (September 2026): Nach der letzten Frage
   nicht einfach zur Auswertung, sondern die danebengegangenen Vokabeln noch
   einmal durchgehen. Gebaut ist das in zehn Spielen - und zehnmal standen
   dieselben fünf Variablen und dieselbe Buchführung da.

   WAS HIER LIEGT, UND WAS NICHT.
   Hier liegt die Buchführung: Was ist danebengegangen, was steht noch aus,
   wie viel davon saß beim zweiten Mal. Der gemerkte Gegenstand selbst ist
   für dieses Modul undurchsichtig - es reicht ihn nur durch. Genau deshalb
   funktioniert das überhaupt, obwohl die Spiele Verschiedenes merken:

     Circus, Issa      eine Vokabel
     Kastell, Villa    eine ganze Runde samt Distraktoren
     Duell             eine Frage samt Fragetyp (zu einem Wort baut das Spiel
                       je nach Zufall eine Bedeutungs-, Formen- oder Klassenfrage)
     Pronomina         einen fertigen Fall
     Arcus, Pendel,
     ViaRomana         einen Satz

   NICHT hier liegt, wie eine Frage aussieht, wie sie wieder gestellt wird und
   was währenddessen ruht (Kastells Mauerstärke, Villas Baufortschritt, Circus'
   Gegner, Duells Herzen, Issas Herzen). Das ist je Spiel verschieden und
   bleibt dort.

   DIE EINE REGEL, DIE HIER STRUKTURELL WIRD:
   `merken()` tut nichts, solange die Wiederholung läuft. Damit kann die zweite
   Runde sich nicht selbst füttern - und das war bisher eine Regel, die zehn
   Dateien einhalten mussten, indem jede ihr `missedItems.push` an
   `!isReviewMode` hängte. Eine davon zu vergessen hieße: eine Runde, die nie
   endet. Das geht jetzt nicht mehr.

   Ebenso: `zaehltInDenKasten()` sagt an einer Stelle, was der Fachlehrer
   entschieden hat - die Wiederholung zählt NICHT in den Leitner-Kasten. Die
   Achievement-Zähler laufen dagegen weiter; der Unterschied ist der Zweck.
   Der Kasten steuert, welches Wort wie oft drankommt - da wäre ein Treffer
   mit der Antwort noch im Kopf irreführend. Die Trophäen zählen Fleiß, und
   wer seine Fehler nochmal durchgeht, hat den Fleiß aufgebracht. */

const LudiReview = (function () {
    'use strict';

    function neu() {
        return { fehler: [], liste: [], idx: 0, richtig: 0, laeuft: false };
    }

    /* Zurücksetzen beim Start einer Runde. Wer das vergisst, schleppt die
       Fehler der vorigen Runde mit - in Pronomina mit seinen vier Startpfaden
       ist das schon beinahe passiert. */
    function zuruecksetzen(w) {
        w.fehler = [];
        w.liste = [];
        w.idx = 0;
        w.richtig = 0;
        w.laeuft = false;
    }

    /* Einen Fehler merken. Während der Wiederholung passiert nichts - siehe
       oben, das ist die tragende Regel. */
    function merken(w, gegenstand) {
        if (!w.laeuft) w.fehler.push(gegenstand);
    }

    function treffer(w) {
        if (w.laeuft) w.richtig++;
    }

    /* Zählt dieser Versuch in den Vokabelkasten? In der Wiederholung nicht. */
    function zaehltInDenKasten(w) {
        return !w.laeuft;
    }

    function laeuft(w) { return w.laeuft; }
    function anzahl(w) { return w.fehler.length; }
    function offen(w) { return w.liste.length; }

    /* Die Warteschlange selbst. Nur EIN Spiel braucht sie: Issa baut die
       Plattformen fuer die naechsten Woerter schon, waehrend noch bei den
       unteren geantwortet wird - sie hat also zwei Zeiger, und der zweite
       gehoert ihr, nicht diesem Modul. Lesend, nicht zum Umbauen. */
    function liste(w) { return w.liste; }

    /* Startet die zweite Runde und gibt den ersten Gegenstand zurück.
       Gemischt, damit die Reihenfolge nicht die der Fehler ist - sonst
       verrät sie, welche zusammengehörten. */
    function start(w) {
        w.liste = w.fehler.slice().sort(function () { return Math.random() - 0.5; });
        w.idx = 0;
        w.richtig = 0;
        w.laeuft = true;
        return w.liste[0] || null;
    }

    /* Der nächste Gegenstand, oder null, wenn die Liste durch ist.
       FEST heisst: genau einmal durch, nicht bis alles sitzt. */
    function naechste(w) {
        w.idx++;
        return w.idx < w.liste.length ? w.liste[w.idx] : null;
    }

    function beenden(w) {
        w.laeuft = false;
        return { gesamt: w.liste.length, richtig: w.richtig };
    }

    /* "Wiederholung 3 von 7" - die Anzeige während der zweiten Runde. */
    function fortschritt(w) {
        return { nummer: w.idx + 1, gesamt: w.liste.length };
    }

    /* Beschriftung des Knopfes am Rundenende. Die Spiele zählen
       Verschiedenes - Wörter, Formen, Fälle, Fragen -, deshalb kommt das
       Wort von aussen, in Einzahl und Mehrzahl. */
    function knopfText(w, einzahl, mehrzahl) {
        var n = w.fehler.length;
        return '📚 ' + n + ' ' + (n === 1 ? einzahl : mehrzahl) + ' wiederholen';
    }

    /* Der Schlusstext nach der zweiten Runde. Der letzte Satz ist überall
       derselbe und soll es bleiben: Er sagt, was mit dem passiert, was WIEDER
       danebenging - sonst klingt die Wiederholung wie ein Freispruch. */
    function bilanzText(w, mehrzahl) {
        return 'Du hast alle <strong>' + w.liste.length + '</strong> zuvor falschen ' +
               mehrzahl + ' nochmal bearbeitet und dabei <strong>' + w.richtig +
               '</strong> davon jetzt richtig beantwortet.<br><br>' +
               'Was diesmal wieder falsch war, bleibt in deinem persönlichen ' +
               'Vokabelkasten auf Rot und kommt beim nächsten Spiel häufiger dran.';
    }

    return {
        neu: neu,
        zuruecksetzen: zuruecksetzen,
        merken: merken,
        treffer: treffer,
        zaehltInDenKasten: zaehltInDenKasten,
        laeuft: laeuft,
        anzahl: anzahl,
        offen: offen,
        liste: liste,
        start: start,
        naechste: naechste,
        beenden: beenden,
        fortschritt: fortschritt,
        knopfText: knopfText,
        bilanzText: bilanzText
    };
})();
