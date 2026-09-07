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
- **Villa.html** (Aedificium Rōmānum) – KNG-Kongruenz. Drei Adjektiv-Modi (regulär -us/-a/-um,
  i-Deklination, gemischt). Sechs Bild-Stufen für den Baufortschritt in `assets/villa/`.
- **ViaRomana.html** – Satzglieder bestimmen: Subjekt, Prädikat, Akk-/Dativobjekt, Genitiv-Attribut,
  Ablativ-Handlungsträger, adverbiale Bestimmungen (Zeit/Ort/Herkunft/Mittel/Begleitung ab L7).
  Volle Tempus-/Genus-Vielfalt.
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
  (#FF00FF) generiert und dann per HSV-basiertem Colorkey freigestellt (Python/PIL), dann skaliert
  und als JPEG (Hintergründe) oder PNG (transparente Elemente) gespeichert.
- **Lektions-Gating**: Jede Engine-Fähigkeit hat eine feste Einführungs-Lektion. Die
  verbindlichen Nummern stehen im Abschnitt „Lehrgang: was wann drankommt“ weiter unten –
  dort nachschlagen, nicht schätzen. Beim Ergänzen einer neuen Fähigkeit gehört die Nummer
  als benannte Konstante in die Engine und in `test-gating.js`.

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
