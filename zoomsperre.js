/* ============================================================
   zoomsperre.js – gegen das Aufziehen auf Spielfeldern.
   Einbinden mit: <script src="zoomsperre.js"><\/script>
   (Schrägstrich mit Absicht, siehe fehlerbanner.js.)
   ============================================================

   NUR IN VOLLBILDSPIELE EINBINDEN. Auf einer Textseite wäre eine
   Zoomsperre ein Schaden – wer schlecht sieht, muss heranholen
   können. Die Einbindung IST die Zustimmung; deshalb gibt es hier
   keine Automatik, die sich über alle Seiten legt.

   Vertretbar ist es auf diesen Seiten, weil sie Spielfelder sind und
   kein Text: `html, body` haben dort `height: 100vh` und
   `overflow: hidden`, sie füllen den Schirm genau einmal, sie
   scrollen nicht, es gibt nichts heranzuholen.
   `test-zoomsperre.js` prüft beide Richtungen – jedes Vollbildspiel
   bindet sie ein, und keine andere Seite tut es.

   WOZU. Aus dem Unterricht gemeldet (Oktober 2026, zum Duell): „Die
   Schülis zoomen oft rum, und das bricht das Spiel." Das ist dort
   kein Herumspielen, sondern die Bauart – zwei Leute spielen
   gleichzeitig am selben Gerät, also liegen zwei Finger auf dem
   Schirm, und Safari liest das leicht als Aufziehen. Dieselbe Bauart
   haben die Fliegenklatsche (zwei Teams), Bomba (das Gerät wandert)
   und das Bingo (Beamer plus Schülergeräte).

   `user-scalable=no` HILFT NICHT. iOS ignoriert es seit Version 10.
   Es steht trotzdem in fast jeder Datei des Projekts und hat dort nie
   etwas bewirkt.

   BEIDE HÄLFTEN SIND NÖTIG:
   - Die `gesture`-Ereignisse sind Safari-eigen, und Safari ist das
     Ziel (iPad). Auf Android greifen sie nicht.
   - `touch-action: manipulation` wirkt überall und nimmt wenigstens
     das Doppeltipp-Zoomen. Was man nicht verhindern kann, darf einen
     wenigstens nicht umwerfen.

   NICHT HIER DRIN: dass ein Spiel beim Aufziehen falsch misst. Das
   betrifft nur das Duell – als einziges rechnet es seine Höhe selbst
   aus –, und die Regel dafür („während `vv.scale > 1.01` nicht
   messen") steht dort, wo gemessen wird.
*/
(function () {
    'use strict';

    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (art) {
        document.addEventListener(art, function (e) { e.preventDefault(); },
            { passive: false });
    });

    function touchAction() {
        if (document.body) document.body.style.touchAction = 'manipulation';
    }
    if (document.body) touchAction();
    else document.addEventListener('DOMContentLoaded', touchAction, { once: true });
})();
