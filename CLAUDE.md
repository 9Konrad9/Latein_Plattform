# Lūdī Rōmānī / Latein-Arena – Projektkontext für Claude Code

Latein-Lernplattform zum Lehrbuch *Pontes* (Lektion 0–35 + T1–T4), Gymnasium Baden-Württemberg.
Browserbasiert, kein Server/Backend, kein Login – reines HTML/CSS/JS, Fortschritt liegt lokal im
`localStorage` des jeweiligen Browsers.

## Grundprinzip

Alle Spiele arbeiten mit echtem, lektionsgefiltertem Wortschatz aus `vocabulary.js` (900+ Einträge).
Schüler:innen wählen vor jeder Runde, bis zu welcher Lektion geübt werden soll (`lessonFilter.js`).
Formen werden **live generiert**, nicht aus festen Beispielsätzen – deshalb wiederholen sich Sätze
praktisch nie, und der Schwierigkeitsgrad wächst automatisch mit der Lektionsauswahl mit.

## Zentrale Dateien (von (fast) jedem Spiel eingebunden)

- `vocabulary.js` – die Wortschatz-Datenbank. Jeder Eintrag: `{ latin, lesson, type, middle,
  gram_clue, gram_class, meaning, ... }`. Bei Verben zusätzlich `perfect`, `perfectLesson`, `ppp`,
  `pppLesson` (nur gesetzt, wenn die Form SPÄTER gelehrt wird als das Wort selbst).
  Für den Satzbau tragen Verben außerdem `valenz` (`"akk" | "dat" | "dat+akk" | "intrans" |
  `"abl"` | `"gen"`, oder ein Array, wenn beide Verwendungen gelten) und `subjBelebt`
  (verlangt das Verb ein Lebewesen als Subjekt?); Nomen tragen `belebt`
  (`"person" | "tier" | "sache"`). Mehrteilige Lemmata haben `satzbau: false`.
  Diese vier Felder sind fachlich gegengelesen – NICHT im Vorbeigehen ändern.
- `nounEngine.js` – zentrale Deklinations-Engine für Substantive. API: `NounEngine.decline(nounObj)`
  gibt `{ sg: {nom,gen,dat,akk,abl}, pl: {...}, gender }` zurück (Werte können `null` sein bei
  defektiven Nomen wie *vīs*!). `NounEngine.getForm(nounObj, caseKey, numerus)` für Einzelformen.
- `verbEngine.js` – zentrale Konjugations-Engine. Deckt ab: Aktiv/Passiv (5 Tempora), Imperativ,
  Infinitive (4 Kombinationen), PPA, Konjunktiv (4 Tempora × 2 Genera), Gerundium/Gerundivum.
  Kernfunktion: `VerbEngine.getFormsForTempus(verbObj, tempus, genus)` → Array mit 6 Personalformen.
  Kennt alle unregelmäßigen Verbfamilien, Deponentien, *fierī*, sowie die Sonderfälle *dare*
  (kurze Vokale) und die 3 lexikalisierten Imperativ-Kurzformen (*dūc, dīc, fac*).
- `progress.js` – Leitner-System (`LudiProgress.recordVocabAttempt`) und Achievement-Logik
  (`LudiProgress.recordCategoryAttempt`, `getAchievementOverview`). Speichert in `localStorage`.
- `achievementToast.js` – Popup-Benachrichtigung bei neu freigeschalteten Achievements.
- `lessonFilter.js` – die Lektionsauswahl-Overlay-Komponente, von praktisch jedem Spiel genutzt.

## Aktive Spiele (Stand zuletzt)

- **CircusV.html** – reine Bedeutungsabfrage (Circus Maximus)
- **Duell.html** – Wortschatz-Duell, mehrere Fragetypen
- **Principia.html** – Grundformen/Stammformen progressiv
- **IssaJump.html** – Jump-and-Run, Bedeutungsabfrage
- **Kastell.html** – Formen-Kastell: Substantiv- UND Verbformen, nutzt die komplette VerbEngine
  (Aktiv/Passiv, Imperativ, Infinitive, PPA, Konjunktiv, Gerundium/Gerundivum), gewichtet nach
  Häufigkeit. Bild-Assets in `assets/kastell/`.
  **Die Distraktoren folgen einer Regel, nicht dem Zufall** (September 2026, nach Rückmeldung
  des Fachlehrers beim Passiv-Üben in L15):
  - Jede Form trägt ihre Merkmale mit (`merkmale`: art, modus, tempus, genus, person, numerus,
    kasus). Zwei Formen unterscheiden sich auf diesen **Achsen**.
  - Angeboten werden **zwei Minimalpaare auf verschiedenen Achsen** plus **einer zwei Achsen
    entfernt**. Die zwei Minimalpaare machen die Frage diagnostisch, der dritte hält sie für
    schwächere Schüler:innen spielbar – im Kastell kostet Falschliegen Mauer.
  - **Die jüngste Achse zuerst.** Wer bis L15 wählt, übt Passiv, also muss sich ein Distraktor
    genau in der Diathese unterscheiden. Die Einführungslektionen werden in
    `achsenEinfuehrung()` aus `verbEngine.js` ABGELEITET, nicht dort hingeschrieben – zwei
    Stellen mit denselben Zahlen driften auseinander.
  - **Gestalt angleichen**: Ab L15 ist Perfekt Passiv zweiteilig (*amātus est*), Präsens Passiv
    einteilig (*amātur*). Ein zweiteiliger Distraktor neben einer einteiligen Zielform ist auf
    einen Blick zu streichen.
  - Vorher wurden die drei falschen Antworten rein zufällig aus dem Paradigma gezogen. Anteil
    echter Minimalpaare gemessen: **vorher** L5 36 % / L15 14 % / L31 7 %, **nachher** überall
    um 65 %. Weite Distraktoren gibt es nur noch, wo das Paradigma keinen näheren hergibt
    (z. B. der Infinitiv bei L5 – dort ist „*amāre* oder *amat*?" gerade die Lernfrage).
    `test-kastell.js` prüft genau das: kein Distraktor weiter weg **als nötig**.
- **Villa.html** (Aedificium Rōmānum) – KNG-Kongruenz. Drei Adjektiv-Modi (regulär -us/-a/-um,
  i-Deklination, gemischt). Sechs Bild-Stufen für den Baufortschritt in `assets/villa/`.
- **ViaRomana.html** – **zwei Modi.**
  1. *Satzglieder bestimmen*: Subjekt, Prädikat, Akk-/Dativobjekt, Genitiv-Attribut,
     Ablativ-Handlungsträger, adverbiale Bestimmung. Volle Tempus-/Genus-Vielfalt.
     Die Knöpfe sind **gestaffelt** – L3 vier, ab L6 das Genitiv-Attribut, ab L9 das
     Dativ-Objekt, ab L15 der Handlungsträger. Vorher standen immer alle sieben da, und
     eine 7. Klasse las dort vier Begriffe, die sie nie brauchte.
  2. *Nur Ablativ: Welche Funktion?* (September 2026, gewünscht für eine 7. Klasse, die den
     Ablativ neu hatte). Gefragt wird mit dem **Fragewort** – Wann? Wo? Wohin? Woher? Womit?
     Mit wem? –, der Fachbegriff steht in der Erklärung. Ab L7 (`ADVERBIAL_LESSON`); davor
     gäbe es nur die Richtungsangabe, also nichts zu unterscheiden.
     Zwei Dinge tragen diesen Modus:
     - **Der Kontrast *in urbem* (wohin?) gegen *in urbe* (wo?)** – dieselbe Präposition,
       anderer Kasus. Dafür baut `SentenceEngine` seit jetzt auch die **Richtungsangabe im
       Akkusativ** (`in`/`ad` + Akk., Pontes L3 – die Engine hielt sie vorher bis L7 zurück).
     - **Reihum statt Zufall.** Der Modus gibt der Engine über `advKey` vor, WELCHE Funktion
       sie bauen soll. Würfelte man den Satz einfach aus, käme die Richtungsangabe gemessen
       in 2,5 % der Runden vor statt in 17 % – sie braucht ein Bewegungsverb und muss sich
       gegen fünf andere Funktionen durchsetzen.
- **Pendel.html** – klassische Pendelmethode (Subjekt → Prädikat → Objekt schrittweise), generiert
  aus echtem Wortschatz, mit Erklärung statt Übersetzungsauswahl am Ende.
- **Arcus.html** – AcI (ab L8). Zwei Schritte: Subjektsakkusativ und Infinitiv im Satz anklicken,
  ab L10 zusätzlich das Zeitverhältnis (gleichzeitig/vorzeitig). Bildmetapher ist der römische
  Bogen: zwei Pfeiler und ein Schlussstein. Nutzt `SentenceEngine.buildAcI()`.
- **Pronomina.html** – vier Modi: Possessiv (handkuratierte Sätze), Personal, Demonstrativ
  (hic/ille/is, KNG-Kongruenz-generiert), Relativ (quī/quae/quod – Kasus kommt von der Funktion
  im Nebensatz, NICHT vom Bezugswort!).
- **Quiz.html** – statisches Kultur-Quiz (`quizData.js`), nicht wortschatz-basiert.
- **Achievements.html** – Trophäensammlung-Übersichtsseite.
- **index.html** – Hauptmenü.

Zwei davon sind **Gruppenspiele** und folgen deshalb anderen Regeln als der Rest: Sie gehören
keiner Person, tragen im Hauptmenü **kein `progress-badge`**, und ihre Vollbild-Layouts schalten
das `min-height: 100vh` aus `theme.css` mit `min-height: 0` ab (siehe Fallstricke unten).

- **Fliegenklatsche.html** – Brettspiel am Beamer für die ganze Klasse. Nicht überlappende
  Wortkacheln auf Marmortafeln (`assets/ui/marmor.png` per `border-image`, Randbreiten in **em**,
  damit der Rahmen von 9 bis 64 px Schrift mitwächst). Zwei Teams, Punkte von Hand.
  Kein Richtig/Falsch, deshalb **kein** `recordVocabAttempt`.
- **Bomba.html** – ein geteiltes Gerät wandert im Kreis, Multiple Choice; wer die Bomba bei
  abgebrannter Lunte hält, verliert. Drei Regeln tragen das Spiel, alle drei nach Rückmeldung
  des Fachlehrers so entstanden – nicht ohne Not daran drehen:
  - **Die Lunte ist unsichtbar.** Keine Zahlen, aber auch **kein Balken**: Dort stand zuerst
    einer, und der war genau die Uhr, die es nicht geben darf – wer sieht, dass ein Viertel
    übrig ist, passt das Ende ab. Dauer je Runde gewürfelt (40–85 s). `luntenRest` darf das
    DOM an keiner Stelle erreichen; `test-bomba.js` prüft das, indem es die Kopfleiste bei
    voller und bei fast abgebrannter Lunte Zeichen für Zeichen vergleicht.
  - **Fehlschuss.** Der erste Fehler auf einer Karte zündet mit 50 %, der zweite auf derselben
    Karte sicher. Ohne diese Regel war ein Fehler folgenlos: Man klapperte alle vier Felder ab
    und lag am Ende immer richtig – Nichtwissen war gratis. Gezählt wird je **Karte**, nicht je
    Runde: Das Gerät wandert, niemand darf für den Fehler einer anderen Person haften.
  - **Kartenuhr.** Läuft die Zeit für eine Karte ab, zählt das wie eine falsche Antwort –
    dieselbe Fehlschuss-Regel, zwei Auslöser. Ohne sie lohnte sich Trödeln: Wer das Wort nicht
    weiß, steht beim Tippen vor 37,5 % Sofortverlust (75 % daneben × 50 % Zündung), Abwarten
    war dagegen billig. Bemessen wie im Circus (feste Denkzeit + Lesezeit aus dem, was auf der
    Karte steht, 3 Wörter/Sekunde): gemessen 10,4 s für kurze, 14,2 s für lange Karten. Sie ist
    absichtlich NICHT knapp – Raten ist hier teuer und soll es bleiben.
    Diese Uhr **darf** sichtbar sein, anders als die Lunte: Sie sagt nichts über den Stand der
    Bombe. Sie sitzt deshalb am Fuß der Frage-Karte, nicht oben bei der Bombe.
  - **Nur der ERSTE Versuch je Karte geht in den Vokabelkasten.**
  Die Bestleistung steht unter einem eigenen `localStorage`-Schlüssel (`ludi_bomba_best`), nicht
  in `saveGameResult`: Sie gehört der Gruppe, nicht dem Gerät.
  **Ton, zwei Fallen – beide am iPad aufgetreten:**
  - iOS gibt die Tonausgabe erst frei, wenn INNERHALB einer Berührung etwas abgespielt wurde.
    Einen `AudioContext` nur anzulegen reicht nicht – es braucht `resume()` **und** einen
    stummen Puffer in derselben Geste (`tonFreischalten()`).
  - **Der Lautlos-Schalter würgt WebAudio ab**, weil Safari es als Umgebungston führt, während
    Videos und Musik weiterlaufen. Bestätigte Ursache beim ersten Klassentest. Von der Seite aus
    weder erkennbar noch umgehbar: Der Kontext meldet brav `running`. Deshalb der Hinweis auf
    dem Startbildschirm. Wer das wirklich beheben will, muss den Ton über ein `<audio>`-Element
    statt über WebAudio erzeugen – dann läuft er über den Medienkanal, an dem der Schalter
    nichts ändert. Das hiesse Tondateien ins Projekt zu legen (oder als Daten-URI einzubetten).

Gelöscht/nicht mehr vorhanden (bewusst entfernt, falls in altem Stand noch auftauchend):
Bollwerk.html, Kastell_backup.html, Adventura.html, Possessiv.html, Tabularium.html,
LektionsCheck.html, Genitiv.html (Compone!) – alle redundant zu neueren/reichhaltigeren Spielen.

## Wichtige Konventionen & bekannte Fallstricke

- **Makronfehler kommen vor**: In der Vokabeldatenbank fanden sich mehrfach fehlende Längen
  (*instruere*→*īnstruere*, *multi*→*multī*, *amicus*→*amīcus*). Bei Unsicherheit lieber
  nachschlagen/prüfen als blind übernehmen.
- **`gram_clue`-Format für Nomen-Ausnahmen**: i-Stamm-Gen.-Pl.-Ausnahmen stehen als
  `"(Gen. Pl. XXX)"` im `gram_clue`-Text und werden von `NounEngine` automatisch geparst – NICHT
  hartkodieren, sondern im Datensatz ergänzen (z.B. bei *mors*, *bōs* nachträglich gefunden).
- **Defektive Nomen** (*vīs* u.a.) liefern `null` für fehlende Kasus – IMMER prüfen, bevor eine
  Form als Distraktor/Zielwort verwendet wird, sonst tauchen `null`/`undefined` im UI auf.
- **Testverfahren**: Jede Änderung wird vor Auslieferung mit jsdom getestet (Syntax-Check per
  `node --check`, dann funktionaler Test durch Laden der HTML-Datei mit `runScripts: 'dangerously'`).
  localStorage funktioniert unter `file://`-URLs in jsdom nicht zuverlässig – bei Bedarf mit
  In-Memory-Ersatz oder `http://`-Basis-URL umgehen.
  Testumgebung liegt in `C:\Users\konra\latein-tests` (Node + jsdom), bewusst AUSSERHALB des
  OneDrive-Ordners – `node_modules` gehört nicht in die Synchronisierung und nicht ins Repo.
  Wiederverwendbare Testbasis dort: `harness.js` (`loadScripts([...])` → `{ ev, errors }`).
  Zwei Fallstricke, die dabei jedes Mal zuschlagen:
  - **`window.eval(quelltext)` funktioniert NICHT** zum Laden der Projektdateien. Deren Globals
    (`globalVocabularyPool`, `NounEngine`, `VerbEngine` ...) sind top-level `const` – solche
    Bindings landen weder auf `window`, noch überleben sie den eval-Scope. Die Dateien müssen als
    echte `<script>`-Tags in die Seite; der Zugriff läuft danach über `window.eval('name')`.
  - **Beim Inlinen die Sequenz `</script` escapen.** `nounEngine.js`, `verbEngine.js`, `progress.js`
    und `achievementToast.js` enthalten sie im Einbinde-Hinweis-Kommentar. Im Browser harmlos (die
    Dateien werden per `src` geladen), beim Inlinen bricht der HTML-Parser dort das Script-Tag ab –
    die Datei lädt dann still nur zur Hälfte.
  - **jsdom kennt `innerText` nicht.** Die Spiele setzen Texte fast überall per `.innerText`; in
    jsdom legt das nur eine gewöhnliche JS-Eigenschaft an, statt den DOM-Text zu ändern.
    `.textContent` liefert deshalb weiter den HTML-Platzhalter – ein Test, der `textContent` prüft,
    prüft nichts. Stattdessen die Eigenschaft selbst lesen (`el.innerText`).
- **Bild-Assets**: Cartoon-Stil, "children's book style, simple clean lines", auf Magenta-Hintergrund
  generiert und dann per HSV-basiertem Colorkey freigestellt, skaliert und als JPEG (Hintergründe)
  oder PNG (transparente Elemente) gespeichert.
  Das Freistellen lief früher über Python/PIL – Python ist auf dieser Maschine nicht mehr
  installiert. Ersatz ist `latein-tests/freistellen.js` (sharp):
  `node freistellen.js quelle.jpg ziel.png --breite 900 --tolerance 30`, mit `--info` nur messen.
  Es leitet den Hintergrundfarbton aus den vier Bildecken ab, statt #FF00FF anzunehmen – die
  Generatoren liefern oft ein abweichendes Magenta (gemessen 322° und 333°). Ausgabe ist
  palettiertes PNG mit 128 Farben; bei diesen flachen Flächen spart das rund 85 % ohne
  sichtbaren Verlust.
- **Es gibt genau ZWEI Knöpfe im Projekt**, beide vollständig in `theme.css` (September 2026).
  Die Unterscheidung ist nicht dekorativ, sondern eine Rolle:
  - **Porphyrrot heißt: hier wird gehandelt.** Runde starten, weiter, zurück, Werkzeug.
    Klassen `.start-btn .play-btn .nav-btn .btn-main .btn-close .end-btn .main-btn .werkzeug-btn`.
  - **Hell auf `--putz-hell` heißt: hier wird geantwortet.** Vier rote Flächen nebeneinander
    erschlügen die Frage darüber. Klassen `.race-btn .build-btn .antwort-btn .shield-btn
    .opt-btn .btn-opt .arena-btn .btn-syntax`.
  Dazu drei Zusatzklassen: `.zweitrangig` (der stille Knopf daneben), `.wiederholen`
  („Fehler wiederholen"), `.correct`/`.wrong` bzw. `.richtig`/`.falsch` am Antwortknopf.
  **Ein neues Spiel nimmt `.start-btn` und den passenden Antwortknopf-Namen** – die vielen
  anderen Namen sind Altlast, kein Angebot.

  Warum das hier steht: Derselbe rote Knopf stand unter **acht** Namen im Projekt, derselbe
  Antwortknopf unter **acht** weiteren – mit Radien von 6 bis 30 px, Rändern von 0 bis 3 px und
  in zwei Spielen noch dunkelrot mit Goldrand aus dem alten Theme. Geteilt war davon nur die
  Porphyrtextur, und auch die nur bei dreien: Wer `class="nav-btn"` schrieb, bekam die Textur
  und sonst nichts. `pruefe-theme.js` meldet seitdem zweierlei – eine Spieldatei, die Farbe
  oder Rand dieser Selektoren erneut setzt (Regel 5), und einen **neuen Knopfnamen**, den
  `theme.css` nicht kennt (Regel 6, mit begründeter Ausnahmeliste für die drei Knöpfe, die
  wirklich anders aussehen: Principias Antwortmünze, Arcus' Bronzetafel, IssaJumps Steuerpfeile).
  Maße darf ein Spiel weiterhin anpassen, Farbe und Rand nicht.

- **Drei geteilte Bausteine neben den Knöpfen** (ebenfalls September 2026, alle in `theme.css`):
  `.start-screen` (Erklärung plus Startknopf, fünfmal Zeichen für Zeichen gleich),
  `.options-grid` (zwei Spalten für die Antwortknöpfe, fünfmal) und **die Schicht** –
  eine fast deckende Lage hellen Putzes über dem Spiel, die es unter vier Namen gab:
  `.feedback-overlay`, `.start-overlay` (Bomba, Fliegenklatsche), `.overlay` (IssaJump),
  `.overlay-screen` (Villa). Echt verschieden ist daran nur zweierlei: Die drei
  Vollbildspiele haben keinen positionierten `.game-container`, über den sie sich legen
  könnten – ihre Schicht ist deshalb `fixed`. Und wer beim Laden schon sichtbar ist
  (Startbildschirm) und wer nicht (Rückmeldung, Endbildschirm).

  **Dabei gefundener Fehler, der leicht wiederkommt:** Ein mittig gesetzter Flexkasten
  (`justify-content: center`) mit `overflow-y: auto` schiebt zu hohen Inhalt nach **oben**
  aus dem Bild – und dorthin lässt sich nicht scrollen. In Bomba stand die Überschrift
  gemessen bei −23 px und war unerreichbar. Die Schicht schreibt deshalb `justify-content:
  center` und darunter noch einmal `justify-content: safe center`; ältere Browser verwerfen
  die zweite Zeile und behalten die erste.

- **UI-Assets in `assets/ui/`** werden per `border-image` eingebunden, nicht per
  `background-size` – sonst verzerren Rahmen und Griffe beim Dehnen. **Die Schnittwerte in
  `border-image-slice` sind Bildpixel und skalieren NICHT mit**: Wird ein Asset ausgetauscht oder
  neu skaliert, müssen sie neu gemessen werden (inneres Feld suchen, Randbreiten ablesen).
  Vor dem Einbau den **Kontrast des inneren Feldes** gegen die Schriftfarbe messen. Gemessen:

  | Asset | inneres Feld | bester Kontrast | Verwendung |
  |---|---|---|---|
  | `pergament.png` + `rolle-links/rechts.png` | `#f6e8cb` | 11,3 mit `#3b2a18` | Satzfeld (Arcus) |
  | `tabula.png` | `#66543b` | 5,85 mit Creme | frei – gut für Überschriften |
  | `plaque.png` | `#aa754a` | 3,66 mit Dunkel | Knopf, Ruhezustand |
  | `plaque-richtig.png` | `#a6904f` | 4,60 | Knopf, richtig |
  | `plaque-falsch.png` | `#a39375` | 4,78 | Knopf, falsch |
  | `pergament-bogen.png` | `#fcebcd` | 12,25 mit `--ink` | Grundfläche `.game-container` |

  **`pergament-bogen.png` ist der Bogen, `pergament.png` das Band.** Nicht verwechseln:
  Das Band (900×175) ist für die Schriftrolle in Arcus, seine linken und rechten Ränder sind
  Schnittkanten, die dort hinter den Walzen verschwinden – auf einer hohen Fläche kämen sie
  zum Vorschein. Der Bogen (900×672) ist ein Blatt mit gerissenen Rändern und eingerollten
  oberen Ecken, Schnitt `107 100 157 114 fill`.
  Bei der Aufbereitung wurde die **Mitte absichtlich flach gemacht** (`latein-tests/pergament-aufbereiten.js`):
  Der Generator legt einen weichen Verlauf hinein, der beim `border-image` je nach Kastengrösse
  anders breitgezogen würde – und er hebelte die PNG-Kompression aus (600 KB statt 156).
  Die Randbreiten stehen in `clamp()`, nicht fest: Bei festen Pixeln frass der Rand auf einem
  320-px-Schirm 42 % der Breite (gemessen), jetzt sind es 26 %.
  **Achtung bei Karten AUF dem Pergament:** `--putz` steht zum Pergamentfeld bei **1,00** –
  die Füllung der `.notice-box` ist darauf farblich nicht mehr zu sehen, sichtbar bleibt sie
  nur durch Rand und Schatten. Wer dort eine Fläche absetzen will, braucht `--wand-tief` (1,41)
  oder dunkler.

  Die Plaques liegen in einem Mittelton, auf dem weder helle noch dunkle Schrift wirklich gut
  steht – für kurze fette Knopfbeschriftung reicht es, für Fließtext nicht. Das Pergament ist
  der klar beste Lesegrund.
  Die Schriftrolle ist dreiteilig: Das Pergamentband dehnt sich per `border-image`, die beiden
  Walzen sitzen als `::before`/`::after` an den Enden. Der Rand darf schmaler sein als der
  Schnitt – er muss nur die wellige Kante tragen, das schafft Platz für den Satz.
- **Personen sind gestaffelt wie die Kasus.** `VerbEngine.PERSON_LESSON` / `getKnownPersonIndices()`:
  L1 nur 3. Sg., L2 dazu 3. Pl., ab L3 alle. `getFormsForTempus()` liefert weiterhin alle sechs –
  die Engine rechnet, wer abfragt, filtert. Dieselbe Lücke wie vorher bei den Kasus: Das Kastell
  bot in L1 alle sechs Personen an.
  **Folge, die leicht übersehen wird:** In L1 gibt es damit nur EINE Verbform, in L2 drei. Für
  vier Antwortmöglichkeiten reicht das nicht – `startDefense()` fängt das ab und verweist auf
  L3. Wer am Gating dreht, muss diese Sperre mitdenken.
- **Lektions-Gating**: Jede Engine-Fähigkeit hat eine feste Einführungs-Lektion. Die
  verbindlichen Nummern stehen im Abschnitt „Lehrgang: was wann drankommt“ weiter unten –
  dort nachschlagen, nicht schätzen. Beim Ergänzen einer neuen Fähigkeit gehört die Nummer
  als benannte Konstante in die Engine und in `test-gating.js`.

  **Der wiederkehrende Fehler sitzt NICHT in den Engines.** Drei Gating-Lücken sind gefunden
  worden, alle drei nach demselben Muster: Die Engine kannte die richtige Zahl, das Spiel hat
  sie nur nicht gefragt.
  1. Kastell bot in L5 Ablative an (Nomenseite hatte gar kein Gating) – im Unterricht aufgefallen.
  2. Kastell bot in L1 alle sechs Personen an – beim Umbau der Distraktoren aufgefallen.
  3. Pronomina liess Demonstrativ- und Relativmodus in jeder Lektion starten. Das Spiel
     **fragte nach Lektionen und ignorierte die Antwort** – gefunden vom systematischen Test.
  4. ViaRomana zeigte immer alle sieben Satzglied-Knöpfe. Milder als die drei anderen –
     falsch antworten konnte man deswegen nicht –, aber vier unbekannte Begriffe auf dem
     Schirm einer 7. Klasse.

  Und einmal in die andere Richtung: Die `SentenceEngine` hielt die **Richtungsangabe**
  (`in`/`ad` + Akk.) bis L7 zurück, obwohl Pontes sie in **L3** einführt. Zu viel Gating ist
  genauso falsch wie zu wenig – nur fällt es niemandem auf, weil nichts Verbotenes erscheint.

  Deshalb prüft `test-gating.js` seit September 2026 nicht nur die Konstanten, sondern **was
  die Spiele anzeigen**: Runden bauen lassen, jede sichtbare Bezeichnung nachschlagen.
  Der Schiedsrichter dafür steht in `latein-tests/lehrgang.js` und **leitet seine Zahlen aus
  den Engines ab** – das ist kein Zirkelschluss, denn Engine gegen Lehrbuch prüft der
  Konstantenblock, hier geht es um Spiel gegen Engine. Der Schiedsrichter hat einen eigenen
  Selbsttest mit 28 Bezeichnungen; ein Prüfer, der falsch einordnet, meldet sonst Unsinn.
  Beide historischen Kastell-Lücken wurden testweise wieder eingebaut – beide werden gefunden.
  **Wer ein neues Formenspiel baut, hängt es dort mit an.**

## Lehrgang: was wann drankommt

Aus dem Inhaltsverzeichnis von *Pontes* übernommen – **die verbindliche Quelle für jedes
Lektions-Gating**. Nicht aus dem Gedächtnis ergänzen, sondern hier nachschlagen.

Die Transitio-Lektionen T1–T4 sind im Code als **Lektion 32–35** geführt (T1=32 … T4=35);
im Buch stehen sie nach L31 und können in beliebiger Reihenfolge bearbeitet werden.

| L | Syntax | Formenlehre |
|---|---|---|
| S | Subjekt/Prädikat, „verstecktes“ Subjekt, Substantiv als Prädikatsnomen | |
| 1 | **Akkusativobjekt** | Subst. Nom.+Akk. Sg. (o-/a-/kons.), Verben 3. P. Sg. |
| 2 | Kongruenz Subjekt–Prädikat | Subst. Nom.+Akk. Pl., Neutra o-Dekl., Vokativ, Verben 3. P. Pl., **Infinitiv** |
| 3 | adverbiale Bestimmung: Richtungsangabe | Verben 1.+2. P., *esse*, Personalpron. (1.+2.), Präp. + Akk. |
| 4 | Frage- und Aufforderungssätze | **Imperativ**, *posse* |
| 5 | Adjektiv/Substantiv als Attribut, Adjektiv als Prädikatsnomen, **KNG-Kongruenz** | Adjektive o-/a-Dekl., gem. Konjugation |
| 6 | **Genitiv als Attribut**, Possessivpronomina | **Genitiv**, Possessivpronomina |
| 7 | **Ablativ als adverbiale Bestimmung** (Ort, Herkunft, Begleitung, Mittel, Zeit) | **Ablativ**, *īre* |
| 8 | **AcI als satzwertige Konstruktion** | Adverbien zu Adj. der o-/a-Dekl. |
| 9 | **Dativobjekt**, Demonstrativpron. *is* | **Dativ**, *is* |
| 10 | Perfekt, **Zeitverhältnisse im AcI** | **Perfekt**, **Infinitiv der Vorzeitigkeit** |
| 11 | adverbiale Nebensätze | *hic*, *ille*, weitere Perfektbildungen |
| 12 | Imperfekt vs. Perfekt | **Imperfekt**, Neutra kons. Dekl. |
| 13 | Futur, Substantivierung von Adjektiven | **Futur I**, *ipse* |
| 14 | Plusquamperfekt | **Plusquamperfekt** |
| 15 | **Passiv** | Präsens/Imperfekt/Futur Passiv, **Infinitiv Präsens Passiv** |
| 16 | Relativsätze | Perfekt+Plusquamperfekt Passiv, **Infinitiv Perfekt Passiv**, **PPP**, Relativpronomen |
| 17 | relativer Satzanschluss | Adjektive i-Dekl. (*ācer, gravis, audāx*), Adverbien |
| 18 | **PPP (Vorzeitigkeit, Passiv) im Participium coniunctum** | |
| 19 | Genitiv possessivus/subiectivus/obiectivus/partitivus | Genitiv der Personalpron., *iste* |
| 20 | **PPA (Gleichzeitigkeit, Aktiv) im Participium coniunctum** | **PPA** |
| 21 | Akkusativ der Ausdehnung | e-Deklination |
| 22 | **Ablativus absolutus** | |
| 23 | Reflexivität im AcI, Satzgliedfunktion von AcI und Infinitiv | *velle* |
| 24 | Irrealis der Gegenwart und Vergangenheit | **Konjunktiv Imperfekt + Plusquamperfekt** |
| 25 | *ut*-Sätze (final, konsekutiv, Wunschsätze), *nē* / *ut nōn* | |
| 26 | *cum*-Sätze (temporal, kausal, konzessiv) | u-Deklination |
| 27 | **nominaler Abl. abs.**, Prädikativum | |
| 28 | gleichzeitige konjunktivische Nebensätze, Partizipien attributiv | **Konjunktiv Präsens** |
| 29 | vorzeitige konjunktivische Nebensätze, indirekte Fragesätze | **Konjunktiv Perfekt** |
| 30 | Konjunktiv im Hauptsatz (Optativ, Jussiv, Adhortativ, Prohibitiv) | *ferre* |
| 31 | Deponentien, **Partizip der Deponentien** | **Deponentien**, *fierī* |
| T1 (32) | Dativ finalis/commodi/possessivus | *nōlle* |
| T2 (33) | Verwendung des **Gerundiums**, Genitivus qualitatis | **Gerundium** |
| T3 (34) | Verwendung des **Gerundivums** (mit und ohne *esse*), Dativus auctoris | **Gerundivum** |
| T4 (35) | *(im vorliegenden Auszug des Inhaltsverzeichnisses nicht enthalten)* | |

Wo diese Zahlen im Code stehen: `VerbEngine.TEMPUS_LESSON_AKTIV/_PASSIV`, `INFINITIV_LESSON`,
`IMPERATIV_LESSON`, `PPA_LESSON`, `KONJUNKTIV_LESSON`, `GERUNDIUM_LESSON`, `GERUNDIVUM_LESSON`
sowie `SentenceEngine.ATTRIBUT_LESSON/ADVERBIAL_LESSON/DATIVOBJEKT_LESSON/PASSIV_LESSON`.
`latein-tests/test-gating.js` prüft alle 22 Konstanten gegen diese Tabelle und dazu, dass die
erzeugten Sätze pro Lektionsgrenze nichts Verfrühtes enthalten.

## Offene Punkte / auf der Liste

- **Falsch beantwortetes am Rundenende wiederholen.** Von den Schüler:innen gewünscht
  (September 2026). Nach der letzten Frage nicht einfach zur Auswertung, sondern die
  danebengegangenen Vokabeln noch einmal durchgehen.
  Betrifft die zehn Spiele mit `recordVocabAttempt`: Arcus, CircusV, Duell, IssaJump,
  Kastell, Pendel, Principia, Pronomina, ViaRomana, Villa. **Nicht** die Fliegenklatsche –
  dort gibt es kein Richtig/Falsch, die Lehrkraft zählt von Hand.
  Was dafür fehlt und was nicht:
  - `progress.js` hält den Leitner-Kasten dauerhaft, aber **keine Liste der Fehler dieser
    Runde**. Die müsste jedes Spiel selbst mitführen – oder besser einmal zentral, damit
    nicht zehnmal dasselbe entsteht.
  - `getWeakVocab()` gibt es schon, liefert aber die dauerhaft schwachen Wörter über alle
    Sitzungen, nicht die dieser Runde. Für den Wunsch ist das etwas anderes.
  - **Entschieden (Fachlehrer):** Die Wiederholungsrunde zählt **nicht** in den Leitner-Kasten
    ein. Begründung: Sonst ginge der Fortschritt zu schnell – wer ein Wort erst im zweiten
    Anlauf und mit der Antwort noch im Kopf trifft, hat es nicht gekonnt.
    Technisch heißt das: in der zweiten Runde **kein** `recordVocabAttempt`.
  - Noch offen: feste zweite Runde, oder so lange, bis alles einmal richtig war?

- **Klassische Vokabelspiele digitalisieren.** Vom Fachlehrer ausgewählt (September 2026),
  noch nichts davon gebaut, Reihenfolge offen. Der harte Filter für alle: kein Server, kein
  Login – nichts darf Geräte untereinander abstimmen müssen. Jedes Spiel läuft entweder an
  EINEM Gerät oder am Beamer für alle.
  - **Vokabel-Bingo.** Jedes Gerät erzeugt sich selbst eine 4×4-Karte mit Bedeutungen aus der
    gewählten Lektionsspanne, die Lehrkraft ruft vom Beamer die lateinischen Wörter auf.
    Der Witz: Das braucht trotz fehlendem Backend keine Abstimmung – alle ziehen aus
    demselben Topf, mehr als „bis Lektion 12" muss nicht synchron sein. Erstes Spiel der
    Arena, bei dem die ganze Klasse gleichzeitig mit eigenem Gerät spielt.
  - ~~Bomba~~ – **gebaut**, siehe „Aktive Spiele" oben.
  - **Memory.** Latein ↔ Deutsch, zu zweit an einem iPad. Das ruhige Gegenstück zur
    Fliegenklatsche.
  - **Heißer Stuhl.** Die Klasse sieht das Wort am Beamer, eine Person nicht und muss es
    aus den Umschreibungen erraten.
  - **Quartett.** Vier Wörter eines Sachfelds sammeln. **Hängt an den Sachfeldern an den
    Nomen, die auch „Semantik Stufe 2" unten braucht** – ein Datenbestand, zwei Zwecke.
    Wenn eines von beiden gebaut wird, lohnt es, die Felder gleich für beide anzulegen.
  - Noch in der Diskussion: **Montagsmaler**. Das Hindernis ist die Wortauswahl – nur ein
    Teil des Wortschatzes ist zeichenbar. `belebt` hilft dabei NICHT: unter `belebt: "sache"`
    stehen *culīna*, *tunica* und *statua* neben *ōtium*, *labor*, *mors* und *gaudium*.
    Auch hier wären die Sachfelder die eigentliche Lösung.

- **Semantik Stufe 2: die Objektseite.** Stufe 1 (Belebtheit des Subjekts) ist umgesetzt und hat
  die Quote semantisch unmöglicher Sätze von 41,5 % auf 0 gedrückt. Ungeprüft bleibt das Objekt:
  rund 49 % der Aktivsätze haben eines, und *poēta vulnus legit* ist weiterhin möglich. Dafür
  bräuchte es grobe Sachfelder an den Nomen (Flüssigkeit, Ort, Text, Abstraktum …) und die
  passende Erwartung am Verb. Deutlich mehr Aufwand als Stufe 1 – erst angehen, wenn im Spiel
  auffällt, dass es stört.

- Satzwertige Konstruktionen: Der **AcI** ist in `Arcus.html` umgesetzt. Offen sind
  **Participium coniunctum** (PPP ab L18, PPA ab L20) und **Ablativus absolutus** (ab L22) –
  gedacht als weitere Modi desselben Spiels, mit einem gemischten Modus als eigentlichem Ziel:
  Der Unterschied zwischen PC und Abl. abs. ist genau die Frage, ob das Bezugswort des Partizips
  im Hauptsatz steht, also ob `head` dorthin zeigt oder nicht.
  Dafür fehlt in `verbEngine.js` noch eine PPP-Deklination (das us/a/um-Muster gibt es bereits
  in `getGerundivumDeclension` und ließe sich nachnutzen).
- Achievement-Kategorie-Tracking (`recordCategoryAttempt`) ruft inzwischen jedes Spiel auf, das
  eine sinnvolle Kategorie hat. Ohne bleiben nur Quiz.html (Kulturwissen, kein Wortschatz) und
  IssaJump.html (reine Bedeutungsabfrage – könnte die Wortart-Zähler mitbedienen, tut es aber
  noch nicht).

## Arbeitsweise, die sich bewährt hat

- Vor größeren Änderungen kurz den Plan/Ansatz erklären, dann erst umsetzen.
- Nach jeder Code-Änderung: Syntax prüfen, dann mit jsdom funktional testen, bevor etwas als
  "fertig" gemeldet wird.
- Bei Unklarheiten über Lehrplan-Reihenfolge oder didaktische Gewichtung lieber nachfragen als
  eine Annahme zu treffen – der Nutzer ist Fachlehrer und hat klare Vorstellungen dazu.
