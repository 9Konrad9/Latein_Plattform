/* lernzeit.js - die Zehn-Minuten-Vokabelzeit.
   Einbinden NACH lessonFilter.js, in jedem teilnehmenden Spiel:
   <script src="lernzeit.js"><\/script>

   Eine kurze, dichte Lernzeit aus mehreren Spielen hintereinander - Wortschatz
   UND Formen, nicht nur Issa. Der Taktgeber ist Lernzeit.html; dieses Modul
   ist das, was in den Spielen davon ankommt.

   DAS TRAGENDE PRINZIP: DIE LERNZEIT IST EIN RAHMEN, KEIN UMBAU.
   Kein einziges Spiel weiss, dass es Teil einer Lernzeit ist. Es gibt keine
   neue Leiste, keinen Eingriff in eine Rundenschleife, keine verkuerzte
   Runde. Das Modul tut genau zwei Dinge, und beide an Stellen, die es ohnehin
   schon gibt:

     1. Es beantwortet `LessonFilter.show` sofort mit der Auswahl, die am
        Anfang der Lernzeit getroffen wurde. Die Spiele rufen den Filter auf
        wie immer und merken nichts.
     2. Es biegt den Weg "zurueck" um: Der Haus-Knopf oben links und jeder
        Link ins Hauptmenue fuehren waehrend der Lernzeit nach Lernzeit.html
        statt nach index.html.

   Warum nicht eine Fortschrittsleiste im Spiel? Weil es im Projekt keinen
   freien Rand gibt. Oben links sitzt der Haus-Knopf, oben quer der
   Fehlerbanner, unten in IssaJump die Steuerpfeile und in Scrinium das Regal.
   Eine feste Leiste wuerde in jedem Vollbildspiel etwas verdecken - und
   muesste in jedem einzeln ausgerichtet werden. Der Haus-Knopf dagegen ist
   in allen elf Spielen Zeichen fuer Zeichen derselbe und stoert nirgends.

   WARUM DER WUERFEL AM DATUM HAENGT.
   Aus dem Unterricht vorhergesagt: "Die 7er beschweren sich, dass manche
   Issa springt bekommen haben und andere nicht." Die Beschwerde gilt nicht
   dem Zufall - niemand stoert sich daran, dass die Folge GESTERN anders war.
   Sie gilt dem Unterschied zum Nachbarn im selben Moment.
   Also wird nicht je Geraet gewuerfelt, sondern aus Datum und Lektionsspanne:
   Jedes iPad rechnet ohne jede Absprache dieselbe Folge aus. Das ist dasselbe
   Prinzip wie beim Bingo - abgestimmt wird zwischen den Geraeten NICHTS
   ausser der Lektionsspanne. Wer am selben Tag eine zweite Folge braucht,
   sagt eine Zahl an; die Lehrkraft ist der Synchronisationskanal.

   UND WARUM DIE PLAETZE FEST SIND.
   Rein gewuerfelt kaeme eine Lernzeit aus vier Bedeutungsspielen heraus.
   Gemessen (latein-tests/probe-lernzeit.js) ist der Vorrat schief: Schon bei
   "bis L2" stehen VIER Formenspiele bereit, aber nur ZWEI fuer die Bedeutung.
   Der Takt legt deshalb die ART je Platz fest und wuerfelt nur, WELCHES Spiel
   dieser Art kommt. Damit bekommt jeder dieselbe Mischung - und auf "die hat
   Issa bekommen" lautet die Antwort: du hattest auch eine Wortschatzrunde,
   nur eine andere. */

const LudiLernzeit = (function () {
    'use strict';

    const SCHLUESSEL = 'ludi_lernzeit';

    /* Die Taktfolge der Plaetze (Entscheidung des Fachlehrers): abwechselnd,
       Wortschatz zuerst. Der Einstieg ist das, was alle koennen; die Formen
       sitzen dazwischen, solange die Koepfe frisch sind. Wiederholt sich,
       solange die Uhr laeuft. */
    const TAKT = ['wortschatz', 'formen', 'wortschatz', 'formen', 'satz'];

    /* Die teilnehmenden Spiele. Draussen bleiben die Gruppenspiele
       (Fliegenklatsche, Bingo, Bomba, Memoria, Duell), Silentium und das
       Kulturquiz: Eine Lernzeit laeuft auf EINEM Geraet, allein.

       `tauglich` sagt, ob ein Spiel in dieser Auswahl ueberhaupt laufen kann.
       ES STEHT HIER KEINE LEKTIONSZAHL. Jede Zahl, die hier noch einmal
       stuende, wuerde von der des Spiels abdriften - geprueft wird deshalb
       gegen die DATEN (gibt es Adjektive? vier Wortfelder?) oder gegen die
       Konstante der Engine, aus der auch das Spiel seine Sperre nimmt.
       Das letzte Wort behaelt ohnehin das Spiel: Lehnt es ab, kehrt man zur
       Lernzeit zurueck und sie geht weiter. test-lernzeit.js prueft, dass
       das nie noetig wird - jedes geplante Spiel muss wirklich starten. */
    const SPIELE = [
        { datei: 'CircusV.html',   name: 'Circus Maximus', art: 'wortschatz',
          tauglich: function () { return true; } },
        { datei: 'IssaJump.html',  name: 'Issa springt',   art: 'wortschatz',
          tauglich: function () { return true; } },
        { datei: 'Quartett.html',  name: 'Quaterniō',      art: 'wortschatz',
          /* Vier Wortfelder mit je vier Nomen - dieselbe Bedingung, die das
             Spiel selbst stellt, nur aus denselben Daten gelesen. */
          tauglich: function (pool) {
              const z = {};
              pool.forEach(function (v) {
                  if (v.type === 'noun' && v.thema) z[v.thema] = (z[v.thema] || 0) + 1;
              });
              return Object.keys(z).filter(function (t) { return z[t] >= 4; }).length >= 4;
          } },

        { datei: 'Principia.html', name: 'Principia',      art: 'formen',
          tauglich: function () { return true; } },
        { datei: 'Kastell.html',   name: 'Formen-Kastell', art: 'formen',
          tauglich: function () { return true; } },
        { datei: 'Scrinium.html',  name: 'Scrīnium',       art: 'formen',
          tauglich: function () { return true; } },
        { datei: 'Villa.html',     name: 'Villa',          art: 'formen',
          /* Villa baut auf KNG-Kongruenz - ohne Adjektive im Topf nichts. */
          tauglich: function (pool) {
              return pool.some(function (v) { return v.type === 'adjective'; });
          } },
        { datei: 'Pronomina.html', name: 'Pronomina',      art: 'formen',
          tauglich: function () { return true; } },

        { datei: 'ViaRomana.html', name: 'Via Rōmāna',     art: 'satz',
          tauglich: function () { return true; } },
        { datei: 'Pendel.html',    name: 'Pendel',         art: 'satz',
          tauglich: function () { return true; } },
        { datei: 'Arcus.html',     name: 'Arcus',          art: 'satz',
          /* Die Zahl kommt aus der Engine, aus der Arcus sie auch nimmt. */
          tauglich: function (pool, maxLektion) {
              return typeof SentenceEngine !== 'undefined' &&
                     maxLektion >= SentenceEngine.ACI_LESSON;
          } }
    ];

    /* ---------- Der Wuerfel ----------
       Muss auf jedem Geraet dasselbe liefern, also KEIN Math.random.
       FNV-1a fuer die Saat, danach mulberry32 - klein, schnell, und beide
       rechnen ueberall gleich. */
    function saatZahl(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }
    function wuerfel(saat) {
        let a = saat >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function heute() {
        /* Ortszeit, nicht UTC: Um 1 Uhr morgens ist das egal, um 23 Uhr
           nicht - und eine Schulstunde liegt dazwischen. */
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
               '-' + String(d.getDate()).padStart(2, '0');
    }

    /* ---------- Den Plan bauen ----------
       pool: der GEFILTERTE Wortschatz, maxLektion: die hoechste gewaehlte
       Stufe, folge: die Zahl zum Ansagen (0 = die des Tages). */
    function plan(pool, maxLektion, folge, laenge) {
        const taugliche = SPIELE.filter(function (s) { return s.tauglich(pool, maxLektion); });
        const nachArt = {};
        taugliche.forEach(function (s) { (nachArt[s.art] || (nachArt[s.art] = [])).push(s); });

        const r = wuerfel(saatZahl(heute() + '|' + maxLektion + '|' + (folge || 0)));
        const folgeListe = [];
        const schonDrin = {};

        for (let i = 0; i < (laenge || 8); i++) {
            /* Die Art dieses Platzes - und wenn es dafuer nichts gibt, die
               naechste im Takt, die etwas hergibt. */
            let kandidaten = null;
            for (let k = 0; k < TAKT.length && !kandidaten; k++) {
                const art = TAKT[(i + k) % TAKT.length];
                if (nachArt[art] && nachArt[art].length) kandidaten = nachArt[art];
            }
            if (!kandidaten) break;

            /* Noch nicht gespielte zuerst - sonst kaeme bei zwei Spielen
               einer Art immer dasselbe zweimal, bevor das andere drankommt.
               Und nie dasselbe Spiel zweimal hintereinander. */
            const vorige = folgeListe.length ? folgeListe[folgeListe.length - 1] : null;
            let offen = kandidaten.filter(function (s) { return !schonDrin[s.datei]; });
            if (!offen.length) offen = kandidaten;
            let waehlbar = offen.filter(function (s) { return !vorige || s.datei !== vorige; });
            if (!waehlbar.length) waehlbar = offen;

            const gewaehlt = waehlbar[Math.floor(r() * waehlbar.length)];
            folgeListe.push(gewaehlt.datei);
            schonDrin[gewaehlt.datei] = true;
        }
        return folgeListe;
    }

    function spiel(datei) {
        return SPIELE.filter(function (s) { return s.datei === datei; })[0] || null;
    }

    /* ---------- Der Zustand ---------- */
    function lies() {
        try {
            const roh = localStorage.getItem(SCHLUESSEL);
            return roh ? JSON.parse(roh) : null;
        } catch (e) { return null; }
    }
    function schreibe(z) {
        try { localStorage.setItem(SCHLUESSEL, JSON.stringify(z)); } catch (e) {}
    }

    function starten(folgeListe, lektionen, maxLektion, dauerSekunden, messpunkt) {
        schreibe({
            plan: folgeListe,
            idx: 0,
            lektionen: lektionen,
            maxLektion: maxLektion,
            /* Ein absoluter Zeitpunkt, keine Restzeit: Die Vokabelzeit ist
               ein Block im Stundenplan, kein Guthaben, das pausiert, wenn
               jemand das iPad weglegt. */
            ende: Date.now() + dauerSekunden * 1000,
            dauer: dauerSekunden,
            gespielt: [],
            messpunkt: messpunkt || null
        });
    }

    function laeuft() { return !!lies(); }
    function stand() { return lies(); }

    function restzeit() {
        const z = lies();
        if (!z) return 0;
        return Math.max(0, Math.round((z.ende - Date.now()) / 1000));
    }
    function zeitUm() { return restzeit() <= 0; }

    function naechstes() {
        const z = lies();
        if (!z || zeitUm()) return null;
        return z.plan[z.idx] || null;
    }

    /* Zum naechsten Spiel. Gibt die Datei zurueck, oder null, wenn Schluss
       ist - navigiert wird vom Aufrufer, damit sich das testen laesst. */
    function weiter() {
        const z = lies();
        if (!z) return null;
        const datei = z.plan[z.idx];
        if (!datei || zeitUm()) return null;
        z.idx++;
        if (z.gespielt.indexOf(datei) < 0) z.gespielt.push(datei);
        schreibe(z);
        return datei;
    }

    function beenden() {
        const z = lies();
        try { localStorage.removeItem(SCHLUESSEL); } catch (e) {}
        return z;
    }

    function mmss(s) {
        const m = Math.floor(s / 60);
        return m + ':' + String(s % 60).padStart(2, '0');
    }

    /* ---------- Was in den SPIELEN passiert ----------
       Nur zwei Griffe, beide an vorhandenen Stellen. */
    function einklinken() {
        /* Abgelaufen zaehlt wie nicht vorhanden. Sonst waere eine
           Vokabelzeit, die niemand beendet hat, eine Falle: Der Eintrag
           bleibt im Speicher stehen, und noch Tage spaeter uebersprungen die
           Spiele den Lektionsfilter und fuehrten in eine Vokabelzeit, die es
           nicht mehr gibt. Die Lernzeit-Seite kommt trotzdem an den Stand
           heran und zeigt die Auswertung - sie fragt `stand()`, nicht dies
           hier. */
        if (!laeuft() || zeitUm()) return false;
        const z = lies();

        /* 1. Der Lektionsfilter antwortet sofort. Die Spiele rufen ihn auf
              wie immer; sie merken nichts. */
        if (typeof LessonFilter !== 'undefined' && LessonFilter.show) {
            LessonFilter.show = function (pool, danach) {
                danach(pool.filter(function (v) {
                    return z.lektionen.indexOf(v.lesson) >= 0;
                }), z.lektionen.slice());
            };
        }

        /* 2. Der Weg zurueck fuehrt in die Lernzeit, nicht ins Hauptmenue. */
        /* Der Rueckweg haengt NICHT am Standardverhalten eines Links.
           Beim Nachsehen im Browser kam der Haus-Knopf auf mehreren Seiten
           gar nicht zum Zug - der Klick wurde abgefangen (nachweislich auch
           OHNE Vokabelzeit, also nichts, was dieses Modul angerichtet
           haette, und im Projekt nicht zu finden). Das darf der einzige Weg
           zurueck nicht aushalten muessen: Wer hier haengenbleibt, sitzt in
           einem Spiel fest und kommt aus der Vokabelzeit nicht heraus.
           Deshalb schickt ein eigener Handler die Seite selbst weiter. */
        function zurueck(e) {
            if (e) e.preventDefault();
            location.href = 'Lernzeit.html';
        }
        function wegeUmbiegen() {
            const haus = document.getElementById('global-menu-btn');
            if (haus) {
                haus.setAttribute('href', 'Lernzeit.html');
                haus.setAttribute('title', 'Zurück zur Vokabelzeit');
                haus.textContent = '⏱';
                haus.addEventListener('click', zurueck);
            }
            const links = document.querySelectorAll('a[href="index.html"]');
            Array.prototype.forEach.call(links, function (a) {
                a.setAttribute('href', 'Lernzeit.html');
                if (/men(ü|ue)/i.test(a.textContent)) a.textContent = 'Zurück zur Vokabelzeit';
                a.addEventListener('click', zurueck);
            });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', wegeUmbiegen);
        } else {
            wegeUmbiegen();
        }
        return true;
    }

    /* Auf der Lernzeit-Seite selbst wird NICHT eingeklinkt: Sie braucht den
       echten Lektionsfilter, um die Auswahl ueberhaupt erst zu erfragen -
       ein umgebogener Filter wuerde dort die eigene Frage beantworten.
       Sie sagt das AUSDRUECKLICH (`window.LUDI_LERNZEIT_HUB = true` vor dem
       Einbinden), statt dass dieses Modul aus dem Pfad raet. Geraten hiesse:
       In jsdom, hinter einem Proxy oder unter einem anderen Dateinamen waere
       die Erkennung still falsch, und zwar in die gefaehrliche Richtung. */
    if (typeof document !== 'undefined' &&
        !(typeof window !== 'undefined' && window.LUDI_LERNZEIT_HUB)) {
        einklinken();
    }

    return {
        SPIELE: SPIELE,
        TAKT: TAKT,
        plan: plan,
        spiel: spiel,
        heute: heute,
        starten: starten,
        laeuft: laeuft,
        stand: stand,
        restzeit: restzeit,
        zeitUm: zeitUm,
        naechstes: naechstes,
        weiter: weiter,
        beenden: beenden,
        mmss: mmss,
        einklinken: einklinken
    };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = LudiLernzeit;
