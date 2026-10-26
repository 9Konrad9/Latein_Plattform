/* ============================================================
   fehlerbanner.js – die einzige Spur, die von einem Fehler auf
   einem fremden Gerät bleibt.
   Einbinden mit: <script src="fehlerbanner.js"><\/script>
   (der Schraegstrich ist Absicht: Die Sequenz </script bricht beim
    INLINEN einer Datei den HTML-Parser ab, und genau daran haengen im
    Projekt schon nounEngine.js, verbEngine.js, progress.js und
    achievementToast.js - siehe CLAUDE.md.)
   ============================================================

   WOZU. Aus dem Unterricht kommt sonst „bei Issa kommen Fehler" –
   damit lässt sich nicht suchen. Mit Banner kam der `keys`-Absturz
   im Oktober 2026 als Meldung MIT ZEILENNUMMER herein, fotografiert
   von einer Schülerin. Das war der Unterschied zwischen „irgendwo"
   und „Zeile 612".

   WARUM EIN MODUL. Den Banner gab es zweimal, in IssaJump und in
   Scrīnium – mit verschiedenen Element-Kennungen (`error-banner`
   gegen `fehler-banner`), verschiedenen Mechanismen
   (`addEventListener` gegen `window.onerror`) und verschiedenem
   Verhalten (Liste mit Zähler gegen nur die erste Meldung). Zwei
   Fassungen derselben Sache driften auseinander, und die 17 übrigen
   Seiten hätten eine dritte bekommen.

   WAS ER FÄNGT. `error` UND `unhandledrejection`: Eine abgelehnte
   Promise löst kein `error` aus und bliebe sonst völlig unsichtbar.

   ER BRAUCHT KEIN HTML. Das Element wird selbst angelegt – sonst
   müsste jede Seite einen Platz dafür vorsehen, und genau der wird
   beim nächsten Umbau vergessen. Es hängt am `body` und liegt
   `fixed` oben: Ein `filter` auf einem Vorfahren machte daraus ein
   `absolute` (siehe das Pergament in IssaJump), deshalb bewusst
   direkt am Körper und nicht im Spielfeld.
*/
(function () {
    'use strict';

    const gesehen = [];
    let banner = null;

    function element() {
        if (banner && banner.isConnected) return banner;
        banner = document.createElement('div');
        banner.id = 'fehler-banner';
        banner.setAttribute('role', 'alert');
        banner.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
            'background:#b03030', 'color:#fff',
            'font:600 0.85rem/1.4 system-ui, sans-serif',
            /* env(safe-area-inset-*): Auf dem iPad sitzt oben die Kerbe,
               und ein Banner, der darunter verschwindet, ist keiner. Das
               stand in Scrīniums eigener Fassung und waere beim Aufraeumen
               sonst verlorengegangen. */
            'padding:max(8px, env(safe-area-inset-top, 0px)) max(14px, env(safe-area-inset-right, 0px)) 8px max(14px, env(safe-area-inset-left, 0px))',
            'text-align:center',
            'box-shadow:0 2px 8px rgba(0,0,0,0.35)',
            /* Er darf nichts blockieren: Wer darunter einen Knopf hat,
               soll ihn trotzdem treffen. */
            'pointer-events:none',
            'white-space:pre-wrap'
        ].join(';');
        (document.body || document.documentElement).appendChild(banner);
        return banner;
    }

    function zeigen() {
        /* Vor dem ersten Bild gibt es noch keinen body - dann später
           nochmal versuchen, statt die Meldung zu verlieren. */
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', zeigen, { once: true });
            return;
        }
        const b = element();
        b.textContent = '⚠️ Fehler: ' + gesehen[0] +
            (gesehen.length > 1 ? '  (und ' + (gesehen.length - 1) + ' weitere)' : '') +
            ' — bitte diesen Text der Lehrkraft zeigen.';
    }

    /* Die ERSTE Meldung ist die interessante; danach wiederholt sich
       meist dieselbe in jedem Bild. Deshalb wird gesammelt, aber nur
       Verschiedenes, und gezeigt wird die erste. */
    function merken(text) {
        if (gesehen.indexOf(text) === -1) gesehen.push(text);
        zeigen();
    }

    window.addEventListener('error', function (e) {
        merken((e.message || 'unbekannter Fehler') + ' (Zeile ' + (e.lineno || '?') + ')');
    });

    window.addEventListener('unhandledrejection', function (e) {
        const g = e.reason;
        merken('unbehandelt: ' + ((g && (g.message || g)) || 'unbekannt'));
    });

    /* Nach aussen, damit Tests am VERHALTEN prüfen können statt am
       Quelltext - und damit ein Spiel notfalls selbst etwas melden kann. */
    window.LudiFehler = {
        liste: function () { return gesehen.slice(); },
        melde: merken
    };
})();
