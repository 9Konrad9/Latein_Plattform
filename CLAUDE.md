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
  Dazu seit Oktober 2026 die **Objektseite**, in zwei Stufen: `objArt` (`"belebt" | "sache"`)
  sagt, was ein Verb als Akkusativobjekt verträgt, `datArt` dasselbe für die drei Dativverben,
  deren Dativ keine Person ist; darunter trägt jede Sache ein `feld` (`"ding" | "ort" |
  `"text" | "zeit" | "stoff" | "abstrakt"`) und jedes wählerische Verb ein `objFeld` mit dem,
  was es verträgt. **Fehlt eines dieser Felder, ist alles recht** – siehe „Semantik Stufe 2a“
  und „2b“. Diese acht Felder sind fachlich gegengelesen – NICHT im Vorbeigehen ändern.
- `nounEngine.js` – zentrale Deklinations-Engine für Substantive. API: `NounEngine.decline(nounObj)`
  gibt `{ sg: {nom,gen,dat,akk,abl}, pl: {...}, gender }` zurück (Werte können `null` sein bei
  defektiven Nomen wie *vīs*!). `NounEngine.getForm(nounObj, caseKey, numerus)` für Einzelformen.
- `verbEngine.js` – zentrale Konjugations-Engine. Deckt ab: Aktiv/Passiv (5 Tempora), Imperativ,
  Infinitive (4 Kombinationen), PPA, Konjunktiv (4 Tempora × 2 Genera), Gerundium/Gerundivum.
  Kernfunktion: `VerbEngine.getFormsForTempus(verbObj, tempus, genus)` → Array mit 6 Personalformen.
  Kennt alle unregelmäßigen Verbfamilien, Deponentien, *fierī*, sowie die Sonderfälle *dare*
  (kurze Vokale) und die 3 lexikalisierten Imperativ-Kurzformen (*dūc, dīc, fac*).
- `progress.js` – Leitner-System (`LudiProgress.recordVocabAttempt`) und Achievement-Logik
  … sowie `weightedPick(pool)`, die Auswahl der nächsten Vokabel. **Sie sperrt die zuletzt
  gezogenen Wörter** (ein Drittel des Topfes, höchstens vier), solange danach genug übrig
  bleibt. Grund: In Lektion 1 gibt es für Issa nur zehn Wörter, und ohne Sperre wiederholte
  sich das Wort gemessen in 10 % der Runden **sofort** – nach ein paar richtigen Antworten
  sogar in 13 %, weil die Gewichtung die gekonnten Wörter herausnimmt und der Rest enger
  wird. Aus dem Unterricht gemeldet, nicht vermutet.
  Die **Schieflage selbst bleibt** und soll bleiben: Was noch nicht sitzt, kommt häufiger
  dran – das ist der Kasten. `test-auswahl.js` prüft beides, die fehlenden Wiederholungen
  und die erhaltene Gewichtung; ohne die zweite Probe könnte die Sperre die Gewichtung
  unbemerkt einebnen.
  (`LudiProgress.recordCategoryAttempt`, `getAchievementOverview`). Speichert in `localStorage`.
- `formen.js` – **der Formenkatalog** (Oktober 2026). Die Engines rechnen, aber sie sagen
  nicht, WELCHE Formen eine Lektionsauswahl hergibt, wie häufig eine Form ist und wie sie
  heißt. `LudiFormen.nomenSlots(nounObj, maxLesson)` und `verbSlots(verbObj, maxLesson)`
  geben Listen von `{ form, label, weight, merkmale }` zurück; dazu `istPassivform(slot)`
  und `kannPersoenlichesPassiv(verbObj)`.
  **Die `merkmale` sind der Grund für das Modul**: An ihnen (art, modus, tempus, genus,
  person, numerus, kasus) hängt, welche Formen einander ähnlich sehen – im Kastell für die
  Distraktoren, und in jedem weiteren Spiel, das Formen vergleicht.
  **Die Lektionsgrenzen stehen hier NICHT noch einmal**, sondern kommen durchweg aus den
  Engines (`getKnownCases`, `getKnownCombinations`, `isImperativeKnown` …). Zwei Stellen mit
  denselben Zahlen driften auseinander.
  Bis Oktober 2026 stand das alles in `Kastell.html` – 194 Zeilen, die ein zweites
  Formenspiel hätte abschreiben müssen. Was im Kastell BLIEB, ist das Bauen einer Runde:
  welche vier Antworten nebeneinander stehen (`buildRoundFromSlots`, `waehleDistraktoren`,
  die Achsen-Logik). Das ist eine andere Frage als „welche Formen gibt es".
- `achievementToast.js` – Popup-Benachrichtigung bei neu freigeschalteten Achievements.
- `review.js` – die Wiederholungsrunde am Rundenende (`LudiReview`). Führt Buch darüber,
  was danebenging, was noch aussteht und wie viel davon beim zweiten Mal saß. **Der
  gemerkte Gegenstand ist für das Modul undurchsichtig** – es reicht ihn nur durch, und
  genau deshalb funktioniert es, obwohl die Spiele Verschiedenes merken (eine Vokabel,
  eine ganze Runde, eine Frage samt Fragetyp). Was NICHT dort liegt: wie eine Frage
  aussieht, wie sie wieder gestellt wird, und was während der Wiederholung ruht.
- **Der Caesar-Wortschatz** (Oktober 2026) steht in `vocabulary.js` unter **`lesson: 36` bis
  `42`** – eine Stufe je Kapitel von *Bellum Gallicum* I 1–7, hinter T1–T4. Sie schalten die
  ganze Formenlehre frei, was für die Lektüre richtig ist. **81 Einträge**: 43 Substantive,
  31 Verben, 6 Adjektive, 1 Adverb.
  - **Nach Kapiteln unterteilt** (nachträglich gewünscht, nachdem die ersten drei Kapitel
    gelesen waren). Ein Wort steht bei dem Kapitel, in dem es **zuerst** vorkommt – gemessen
    am Text, nicht geschätzt (`latein-tests/caesar-kapitel.js`):

    | Kapitel | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
    |---|---|---|---|---|---|---|---|
    | Stufe | 36 | 37 | 38 | 39 | 40 | 41 | 42 |
    | neue Wörter | 24 | 15 | 20 | 6 | 6 | 2 | 8 |
    | kumuliert | 24 | 39 | **59** | 65 | 71 | 73 | 81 |

    Einzelne späte Kapitel sind zu klein für eine Runde (Kap. 6 hat zwei Wörter) – die Spiele
    lehnen das sauber ab, und im Unterricht wählt man ohnehin mehrere Stufen.
  - **Fallstricke beim Zuordnen am Text**, beide teuer bezahlt und deshalb notiert:
    `middle` ist `"multitūdinis f."` mit dem Geschlecht dahinter – wer die Nichtbuchstaben
    einfach wegwirft, sucht nach `multitudinisf` und findet elf Wörter nicht. Und beim
    Endungsabwerfen muss die **kürzeste** passende Endung weg, nicht die erste in der Liste:
    Von `ignis` blieb über `nis` nur `ig` übrig (zu kurz), und ein blindes Kürzen um zwei
    Zeichen als Ersatz machte aus `efferō` ein `effe`, das `effeminandos` in Kapitel 1 traf –
    wo *efferre* gar nicht steht.
  - **Woher die Auswahl kommt: aus dem Text.** Die 604 Wortformen von BG I 1–7 (gemeinfrei)
    wurden gegen die 917 vorhandenen Einträge gehalten; übrig blieben diese 81. Der Pontes-
    Wortschatz deckt mehr ab, als man denkt – *flūmen, oppidum, exercitus, legiō, proelium,*
    *cōnārī, persuādēre, cōnstituere* standen längst drin.
  - **Warum nichts übernommen wurde:** Es gibt **keine frei lizenzierte deutsche**
    Caesar-Wortliste. Die *Dickinson College Commentaries* stellen ihre Kernwortschätze unter
    CC BY-SA, aber in dreizehn Sprachen **ohne Deutsch**; alles Deutsche (Klett, Buchner,
    Reclam) ist urheberrechtlich geschützt. Die Bedeutungen sind deshalb selbst geschrieben.
    **Wer das erweitert, prüft das erneut – und schreibt die Bedeutungen selbst.**
  - **Keine Eigennamen** (Entscheidung des Fachlehrers): *Helvētiī, Orgetorīx, Garumna* stehen
    nicht drin. „Was bedeutet Orgetorix?" ist keine sinnvolle Frage; die Namen klärt der
    Unterricht.
  - **Nicht aufgenommen, obwohl im Text:** die Komparative *ulterior* und *īnferior*. Sie
    stünden in Villas KNG-Spiel zwischen den o-/a-Adjektiven und würden dort falsch
    dekliniert. Wer sie braucht, behandelt sie eigens.
  - **`perfectLesson`/`pppLesson` bleiben leer.** Die beiden Felder sagen, dass eine Form
    SPÄTER drankommt als das Wort – auf der Lektürestufe ist längst alles eingeführt.
  - `test-caesar.js` prüft die Einträge gegen die Engines (jede Deklination, jede Konjugation),
    gegen Dopplungen mit dem Pontes-Teil und auf die Feldkonventionen. Mit der heruntergeladenen
    Textdatei als Argument prüft er zusätzlich, dass **jedes Wort wirklich im Text steht** –
    dabei ist aufgefallen, dass Caesar *adsciscunt* schreibt, nicht *asciscunt*.
- **Die Lektionsauswahl beschriftet ihre Stufen** (`LESSON_LABELS` in `lessonFilter.js`):
  0 = „Salvē", 32–35 = „T1"–„T4", 36–42 = „Caesar 1"–„Caesar 7". Vorher gab es nur den
  Sonderfall 0, und die
  Transitio-Lektionen hießen „Lektion 32" bis „Lektion 35" – im Buch heißen sie T1–T4, und
  niemand sucht sie unter einer Zahl. **Wer eine Stufe ergänzt, ergänzt sie dort.**
- `bedeutung.js` – zerlegt eine Bedeutungsangabe in ihre **Sinne** und sagt, ob zwei Einträge
  sich einen davon teilen (`LudiBedeutung.kollidiert`, `waehleDistraktoren`). Gebraucht von
  allen Spielen, die nach der Bedeutung fragen (Issa springt, Circus, Duell).
  **Wozu:** Die falschen Antworten wurden aus anderen Wörtern gezogen und nur nach dem TEXT
  verglichen. Neben *canere* („ertönen") stand deshalb „singen" (aus *cantāre*) als FALSCHE
  Antwort – obwohl *canere* genau das heißt. Wer es wusste, antwortete richtig und bekam
  „falsch". Aus dem Unterricht gemeldet (Oktober 2026) und der ärgerlichste Fehler überhaupt,
  weil er sich nicht erklären lässt.
  **Warum die Quote täuscht:** Es traf nur 0,2–0,8 % der Runden. Aber der Leitner-Kasten
  schiebt ein zu Unrecht als falsch gewertetes Wort auf **Rot**, und rote Wörter kommen
  häufiger dran – für das einzelne Wort wird daraus eine Schleife, die sich selbst am Laufen
  hält. Betroffen sein KÖNNEN 17 % der Wörter bis L12 und 27 % bis L35, darunter *clāmāre,
  vidēre, agere, manēre, quaerere*.
  Kommen keine drei sauberen Distraktoren zusammen, wird **weniger** zurückgegeben – nie
  aufgefüllt. Der Aufrufer nimmt dann ein anderes Wort.
  **`LudiBedeutung.fuer(eintrag, maxLektion)`** gehört dazu: Manche Wörter heißen in der
  LEKTÜRE etwas anderes als im Lehrgang. Siehe `meaningAb` unten.
- `lessonFilter.js` – die Lektionsauswahl-Overlay-Komponente, von praktisch jedem Spiel genutzt.

## Aktive Spiele (Stand zuletzt)

- **CircusV.html** – reine Bedeutungsabfrage (Circus Maximus)
- **Duell.html** – Wortschatz-Duell, mehrere Fragetypen. Zwei Spielfelder übereinander,
  das obere auf dem Kopf – **das einzige Spiel, das seine Höhe selbst ausrechnet**.
  **Die Regel: Die Spielfläche FOLGT dem sichtbaren Bereich, in beide Richtungen.**
  Dreimal ist hier dasselbe gemeldet worden („das Format stimmt auf dem iPad nicht"),
  und zweimal hat der Versuch, auf Nummer sicher zu gehen, es schlimmer gemacht:
  - **Ein pauschaler Abzug von 8 %** für eine Browserleiste, die gar nicht da sein muss.
    Die Annahme dahinter: Wenn `visualViewport.height` dasselbe meldet wie `innerHeight`,
    könne die Seite nicht wissen, ob eine Leiste im Weg steht. Das ist falsch – **auf iOS
    zieht `innerHeight` die Safari-Leisten bereits ab**, genau wie `visualViewport`; dass
    beide übereinstimmen, ist dort der Normalfall. Zu hoch gemacht hat die Seite nie
    `innerHeight`, sondern die CSS-Einheit `vh`, und die ist mit `svh` längst abgelöst.
    Gekostet hat der Abzug quer 65 px und hoch 86 px Spielfläche – gemessen.
  - **„Nur verkleinern, nie vergrössern".** Gut gemeint: Die sichere CSS-Höhe (`100svh`)
    sollte nicht von einer zu grossen Messung überschrieben werden. Nur **verdeckt der
    einmal gesetzte Inline-Stil den CSS-Wert**, und damit gab es keinen Weg zurück nach
    oben. Wer das iPad vom Quer- ins Hochformat drehte, behielt die 745 px des
    Querformats auf einem 1080 px hohen Schirm: **335 px, 31 % des Bildes, leere Wand**,
    beide Hälften oben zusammengeklebt. Das war der eigentliche Befund.
  **Die Lehre:** Ein Sicherheitsabschlag, den nichts wieder zurücknimmt, ist kein
  Sicherheitsabschlag, sondern ein dauerhafter Fehler. Wer der Messung nicht traut,
  braucht einen Rückhalt, der NACHMISST – hier die Dichte-Schleife: Sie verdichtet den
  Inhalt, solange eine Knopfreihe aus ihrer Hälfte **oder aus dem Fenster** ragt. Das
  wirkt nur, wenn etwas wirklich übersteht, und kostet sonst nichts.
  **Und dann das Aufziehen** (nachgereicht: „die Schülis zoomen oft rum, und das bricht
  das Spiel"). Das ist hier **kein Herumspielen, sondern die Bauart**: Zwei Finger auf
  dem Schirm sind der Normalfall – zwei Leute spielen gleichzeitig, eine oben, eine
  unten –, und Safari liest das leicht als Aufziehen.
  - **`user-scalable=no` hilft nicht. iOS ignoriert es seit Version 10.** Es steht in
    16 von 18 Dateien des Projekts und hat dort noch nie etwas bewirkt.
  - Beim Aufziehen meldet `visualViewport` die **vergrösserte Sicht**, also eine
    kleinere Höhe – bei doppelter Vergrösserung die halbe. Die wurde für die
    Bildschirmhöhe gehalten. Gemessen bei 810 px Schirm: **405 px bei 2×, 270 px bei 3×**.
    Das Spiel fiel also mitten im Zug auf die halbe Höhe zusammen.
  - **Der verfügbare Platz ändert sich beim Aufziehen gar nicht** – nur der Ausschnitt,
    durch den man schaut. Also wird in dieser Zeit nicht gemessen (`vv.scale > 1.01`),
    und die zuletzt gute Höhe bleibt stehen.
  - Dazu wird die Geste abgefangen: `gesturestart`/`gesturechange`/`gestureend` mit
    `preventDefault` (Safari-eigen, und Safari ist das Ziel), und `touch-action:
    manipulation` am Körper gegen das Doppeltippen. Vertretbar ist das, weil diese Seite
    ein Spielfeld ist und kein Text: Sie füllt den Schirm genau einmal, sie scrollt
    nicht, es gibt nichts heranzuholen. **Beides zusammen ist nötig** – auf Android
    greifen die gesture-Ereignisse nicht, und was man nicht verhindern kann, darf einen
    wenigstens nicht umwerfen.
  **Wie schlimm es zusammen war:** Die beiden Fehler griffen ineinander. Einmal
  aufziehen und wieder loslassen – und weil die Höhe nur sinken durfte, stand das Spiel
  danach **bis zum Neuladen auf 270 von 810 px**. Das ist der Zustand, den die Klasse
  beschrieben hat.
  Geprüft wird das alles in `test-duell-format.js` am Verhalten (acht Schritte: laden,
  drehen, zurückdrehen, Leiste herein, Leiste heraus, 2× aufziehen, 3× aufziehen,
  loslassen) **samt zwei Gegenproben** – eine je Fehler, denn die beiden sind
  verschieden. Der jeweils alte Stand wird testweise wieder eingebaut und muss
  durchfallen; er verliert beim Drehen genau die 335 px und beim Aufziehen genau die
  405/270 px, die im Browser gemessen wurden.
  **`test-layout.js` hielt bis dahin die umgekehrte Regel fest** („die Höhe darf nur
  verkleinern"). Eine Regel, die einen Fehler festnagelt, fällt nie von selbst auf – der
  Test war grün, während der Fehler im Unterricht stand.
  **Offen, bewusst nicht mitgeändert:** Die Fliegenklatsche hat dasselbe Problem von der
  Bauart her – zwei Teams am selben Gerät, also zwei Finger. Sie rechnet ihre Höhe nicht
  selbst aus, fällt also nicht zusammen; aufziehen lässt sie sich aber genauso. Das ist
  ein eigener Durchgang durch alle Vollbildspiele und gehört besprochen.
- **Principia.html** – Grundformen/Stammformen progressiv
- **IssaJump.html** – Jump-and-Run, Bedeutungsabfrage. Das beliebteste Spiel der Arena;
  drei Dinge daran sind gemessen und nicht geraten (September 2026, nach Rückmeldung
  des Fachlehrers):
  - **Ein Sprung trägt genau EINE Reihe.** Issa steigt 207 px – diskret gerechnet, die
    Schulformel sagt 202,5, und deshalb leitet `SPRUNGHOEHE` den Wert aus der Physik ab,
    statt ihn hinzuschreiben. Die Reihenabstände liegen bei **125–145**: eine Reihe hat
    62 px Luft, zwei Reihen fehlen 43 px. Vorher waren es 95–130, und damit schaffte ein
    Sprung zwei Reihen mal so und mal nicht – je nachdem, was der Würfel für die beiden
    Abstände ergeben hatte. Genau daher kam „man kann scheinbar eine Plattform
    überspringen, aber es reicht nicht ganz".
    **Der schlimmste Fall stand woanders:** Die erste gebaute Reihe hatte einen festen
    Abstand von 100 px zur Startplattform. Zwei davon sind 200 – weniger als ein Sprung.
    Gefunden hat das der Test, nicht das Lesen.
  - **Nach einer falschen Antwort setzt Issa auf der RICHTIGEN Plattform derselben Reihe
    auf.** Vorher fiel sie von der falschen weiter und landete oft gleich noch einmal
    daneben – und sie bekam nie zu sehen, welche die richtige gewesen wäre. Dazu gehört
    eine zweite Sperre: Eine Reihe wird **genau einmal** beantwortet
    (`beantworteteReihen`), sonst zählte das zweite Aufsetzen als zweite Antwort.
  - **Zwei Gegenstände, beide römisch und beide mit einem Grund.**
    `scutum`: Zehn Sekunden lang kostet eine falsche Antwort kein Herz – er schützt das
    SPIEL, nicht das Lernen: Was falsch war, geht trotzdem als falsch in den
    Vokabelkasten, sonst ließe sich Fortschritt erkaufen. Gegen den Sturz aus dem Bild
    hilft er nicht.
    `catapulta`: **469 px, drei Reihen – also über ein Antwort-Feld hinweg. Eine Frage
    fällt aus, und genau das ist die Belohnung** (Entscheidung des Fachlehrers: dem
    Lerneffekt schadet eine übersprungene Frage nicht).
    Zwei Anläufe davor waren zu zaghaft und beide im Unterricht durchgefallen: Erst warf
    der Katapult genau **auf** das Antwort-Feld – man kam an, ohne geschaut zu haben,
    wohin, und verlor ein Herz. Dann auf die neutrale Reihe direkt darunter – sauber,
    aber ohne Gewinn, weil die dafür eingeschobene Reihe genau das kostete, was der Wurf
    sparte.
    Die 469 px sind nicht frei gewählt: Drei Reihen sind höchstens 435 auseinander, vier
    mindestens 500. Der Wurf endet also immer auf einer **neutralen** Reihe.
    Eine überflogene Reihe gilt als durch (`handlePlatformLanding` streicht beim Aufsetzen
    alle Antwort-Reihen unterhalb) – sonst zeigte die Anzeige weiter deren Wort, obwohl es
    nicht mehr zu erreichen ist. Gezählt wird dafür nichts: Eine übersprungene Frage ist
    weder richtig noch falsch.
    `test-issa.js` prüft, **worauf** der Wurf endet, nicht nur wie weit er trägt.
    Beide Gegenstände sind vorerst mit Canvas gezeichnet (rundes Scutum mit Buckel,
    Onager mit Wurfarm); Bild-Assets können an dieselbe Stelle wie die Plattformen.
    Häufigkeit nach dem ersten Klassentest halbiert: 11 % (Katapult) und 8 % (Scutum)
    je passender Reihe, also rund alle siebzehn Reihen ein Fund.
  - **KEIN Pergament um dieses Spielfeld**, anders als bei allen anderen Spielen. Der
    Bogen hält dort Text, hier hielte er ein Bild – Mehrwert null, Kosten 14 % Spielhöhe
    im Querformat (gemessen). Dazu kam ein Nebeneffekt, der nicht offensichtlich ist:
    Das `filter: drop-shadow` des Pergaments macht aus jedem `position: fixed` darin ein
    `absolute`. Damit sassen die Steuerpfeile wieder auf der Bühne statt am
    Bildschirmrand, obwohl die Querformat-Regel sie längst hinausgeschickt hatte.
  - **Eine Stelle für neue Reihen** (`baueNaechsteReihe()`). `resetGame()` hatte eine
    eigene Schleife und bekam die Zusatzreihe hinter einem Katapult nicht mit – die
    Katapulte des Startbildschirms warfen deshalb weiter aufs Antwort-Feld.
  - **Die Wiederholungsrunde endet an dem, was AUSSTEHT – nicht an einer Zahl.**
    Aus dem Unterricht gemeldet (September 2026): „Irgendwann waren keine Vokabeln mehr, nur
    noch Springen." Die Runde endete nach `LudiReview.offen(wdh)` Antworten. Wer eine
    Antwort-Reihe **übersprang**, erreichte diese Zahl nie: Die überflogene Reihe gilt als
    durch (`handlePlatformLanding` streicht alles darunter), **gezählt wurde sie nicht**. War
    die Warteschlange danach abgebaut, wuchs nur noch neutraler Boden nach – ein Lauf ohne
    Ende. Der Weg dorthin war der Katapult, der ja genau über ein Antwort-Feld hinwegträgt.
    Zwei Dinge dagegen, beide nötig:
    - **In der Wiederholung gibt es keine Gegenstände.** Aus demselben Grund wie die ruhenden
      Herzen: Das Spiel ist entschieden, wiederholt wird nur noch. Der Katapult überspränge
      genau die Frage, die man nochmal sehen soll, und das Scutum schützt vor einem
      Herzverlust, den es dort gar nicht gibt.
    - **`wiederholungFertig()`** statt eines Zählers: fertig ist, wenn kein Wort mehr in der
      Warteschlange steht UND keine offene Antwort-Reihe mehr auf dem Schirm ist. Geprüft wird
      auch direkt nach dem Streichen der passierten Reihen – sonst bliebe ein Aufsetzen auf
      einer NEUTRALEN Plattform unbemerkt, und genau dort endet der Katapultwurf.
    **Die Lehre:** Zwei Zahlen, die zusammenpassen müssen, passen irgendwann nicht mehr
    zusammen. `reviewAnswered` ist deshalb ersatzlos weg – was aussteht, steht in den
    Plattformen selbst. `test-issa.js` prüft beides mit Gegenprobe.
  - **Die erreichte Höhe ist eine zweite Bestleistung** (September 2026, von Schüler:innen
    gewünscht). Sie steht im Hauptmenü auf der Karte („🏆 1420 m hoch · Vokabeln 38/45") und
    trägt die Trophäe *Himmelsstürmerin* (200 / 500 / 1000 / 2000 m).
    - **Warum ein eigenes Fach und nicht `bestScore`:** `bestScore` ist im ganzen Projekt die
      Lernquote, und Hauptmenü wie Trophäenseite lesen sie als „richtig von gesamt". Eine Höhe
      hätte dort keine Bezugsgröße und käme als „142 / 45" heraus. Dafür gibt es
      `LudiProgress.recordBest(gameId, name, wert)` / `getBest(...)` mit dem Fach `bests`.
    - **Sie ist trotzdem eine ehrliche Lernmarke**, anders als Silentiums Stille: Höher kommt
      nur, wer trifft – drei Herzen enden den Lauf. Eine Antwortreihe liegt je drei
      Plattformreihen auseinander, also rund 40 Meter; 200 m sind etwa fünf Wörter am Stück,
      2000 m etwa fünfzig.
    - **Nicht aus der Wiederholungsrunde.** Dort kosten Fehler kein Herz, Issa könnte also
      beliebig steigen. Heute ist der Zweig ohnehin unerreichbar (`endGame()` läuft nur über
      die Herzen, und `startReview()` setzt den Zähler auf null) – die Sperre steht da, damit
      das so bleibt.
    - **Gefundener Fehler, der leicht wiederkommt:** `saveGameResult()` baut den Spieleintrag
      NEU. Die frisch gespeicherte Höhe war damit nach der nächsten Runde wieder weg. Wer dort
      ein Feld ergänzt, muss es in der Übernahmezeile mitnennen. Gefunden vom Test, nicht beim
      Lesen.
  - **Die Wortart-Zähler laufen jetzt mit** (`Substantiv`/`Verb`/`Adjektiv`) – der offene Punkt
    von weiter unten ist damit erledigt. Wie in den fünf anderen Spielen laufen sie **auch in
    der Wiederholung** weiter, während der Vokabelkasten dort ruht.
  - **Trophäen werden gesammelt und erst am Rundenende gezeigt**, nicht als Einblendung während
    des Laufs. In einem Spiel, das von Reaktion lebt, kostet ein Popup mitten im Sprung genau
    das Herz, das es feiern wollte. IssaJump bindet deshalb `achievementToast.js` gar nicht ein.
  - **Der Fehlerbanner hat sich bezahlt gemacht.** IssaJump fängt `window.onerror` ab, zeigt die
    erste Meldung samt Zeilennummer an und bittet darum, den Text der Lehrkraft zu zeigen. Genau
    so kam der `keys`-Fehler herein – mit Zeilennummer, statt als „bei Issa kommen Fehler".
    Eine Meldung, die niemand notiert, hilft beim Suchen nicht. **Das wäre in den anderen
    Spielen genauso nützlich** und ist bisher nur hier eingebaut.
- **Kastell.html** – Formen-Kastell: Substantiv- UND Verbformen, nutzt die komplette VerbEngine
  (Aktiv/Passiv, Imperativ, Infinitive, PPA, Konjunktiv, Gerundium/Gerundivum), gewichtet nach
  Häufigkeit. Bild-Assets in `assets/kastell/`.
  **Welche Formen es überhaupt gibt, steht seit Oktober 2026 in `formen.js`** – hier bleibt,
  was eine RUNDE daraus macht.
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

  **Eine Frage, die sich nicht sauber stellen lässt, wird nicht gestellt** (Oktober 2026, nach
  gehäuften Fehlermeldungen aus dem Unterricht). Bei vier Knöpfen und den Labels, die eine
  Lektionsauswahl kennt, muss ein Wort **vier unterscheidbare Formen** haben. Bis L5 kennt die
  Nomenseite nur Nominativ und Akkusativ, also genau vier Labels – und dann scheitern:
  - **Neutra**: *officium* hat Nom. Sg. = Akk. Sg. und Nom. Pl. = Akk. Pl.
  - **konsonantische Deklination**: *pater, māter, frāter, soror, clāmor* haben Nom. Pl. = Akk. Pl.

  Gemessen traf das **10 von 23 Nomen bei „nur L2", 13 von 30 bei L3, 19 von 44 bei L5** –
  rund 40 % des Wortschatzes. Dort griff ein „Sicherheitsnetz", das an einen schon gewählten
  Text ein **unsichtbares Zeichen** hängte und ihn ein zweites Mal anbot: zwei Knöpfe mit
  derselben Beschriftung, in **63 von 120 Runden**. Und der Zweig, der nie gefeuert hat, war
  noch schlimmer – fand sich GAR kein Distraktor, verdoppelte er die **richtige** Antwort; wer
  den Doppelgänger angeklickt hätte, wäre für eine richtige Antwort als falsch gewertet worden.

  Jetzt wird nichts mehr aufgefüllt: `brauchbareDistraktoren()` zählt, wie viele Labels
  überhaupt taugen (gleiche FORM scheidet aus – *officia* ist Nom. UND Akk. Pl.), das Ziel wird
  nur unter Formen mit mindestens drei gewählt, und `buildRoundFromSlots()` gibt sonst `null`.
  `startDefense()` siebt den Topf **vor** dem Start, `showWave()` zieht notfalls ein anderes
  Wort. `test-antworten.js` spielt dafür jede Lektionsauswahl durch – einzeln und als Bereich.

  **Modus 3: Nur Passivformen** (Oktober 2026, für eine 8. Klasse, die das Passiv neu hat).
  Gefragt wird ausschließlich eine Passivform; alles andere bleibt wie in Modus 2.
  - **Eingeschränkt ist nur das ZIEL, nicht die Distraktoren.** `buildRoundFromSlots()` nimmt
    dafür einen Filter entgegen und sucht das Ziel nur unter den passenden Formen – die
    falschen Antworten kommen weiter aus dem ganzen Paradigma. Genau so muss es sein: Die
    wichtigste falsche Antwort ist die **Aktivform derselben Person** (*capiēmur* gegen
    *capiēmus*). Gemessen steht sie in **100 % der Runden** dabei, und daneben rund die
    Hälfte Passivformen für die Unterscheidung innerhalb des Passivs. Wer auch die
    Distraktoren einschränkte, nähme dem Modus seinen Sinn – `test-kastell.js` prüft beides.
  - **Der Topf braucht ein Akkusativobjekt.** Die Engine bildet zu fast jedem Verb
    Passivformen – sie konjugiert, sie denkt nicht –, aber *venīmur* heißt nichts. Gemessen:
    **39 von 142 Verben** im Passiv-Topf bei L15 sind intransitiv oder stehen mit dem Dativ
    (*venīre, currere, clāmāre, respondēre, placēre* …), also mehr als jede vierte Frage.
    `kannPersoenlichesPassiv()` liest dafür `valenz`; übrig bleiben 103 Verben.
    Das unpersönliche Passiv (*curritur*) bleibt damit draußen – Absicht: Pontes führt in L15
    das persönliche ein, und eine Form ohne Person passt nicht in ein Spiel, das nach Person
    und Numerus fragt.
  - **Deponentien bleiben draußen** (ab L31): Ihre Formen *sind* passiv, ihre Bedeutung ist
    aktiv. In einem Modus, der gerade das Passiv einübt, ist das die eine Form, die das
    Falsche beibringt. Im gemischten Verbmodus kommen sie weiterhin vor.
  - **Die Lektionssperre steht VOR dem Topfbau.** Sie stand zuerst dahinter, und dann war
    `targetPool` schon gefüllt, obwohl die Runde nie startete – gefunden vom Test, der das
    Verhalten prüft statt des Quelltexts. Die Zahl kommt aus `VerbEngine.TEMPUS_LESSON_PASSIV`.
  - **Noch offen, bewusst nicht mitgeändert:** Modus 2 bietet dieselben unmöglichen
    Passivformen weiterhin an (*venīmur* & Co.), nur eben seltener, weil dort auch Aktivformen
    drankommen. Dieselbe Prüfung ließe sich dort einhängen – das ändert aber einen
    bestehenden Modus und gehört besprochen, nicht nebenbei erledigt.
- **Scrinium.html** – **Kasusformen einsortieren** (Oktober 2026). Schriftrollen landen auf
  einem Pult, jede trägt eine Nomenform und darunter das Lemma wie im Vokabelheft
  (*patribus* / *pater, patris m.*). Sie gehören ins Fach ihres Kasus – gezogen oder
  getippt. Ist das Pult voll, ist Schluss. Nutzt `formen.js`.
  - **Der Name ist NEU VERGEBEN.** `Tabularium.html` gab es schon einmal (ein Genitiv-Spiel
    mit Besitzurkunden) und steht unten in der Liste der bewusst gelöschten Dateien. Damit
    niemand denkt, das alte Spiel sei zurück, heißt dieses *scrīnium* – die römische
    Buchkapsel, in der Schriftrollen standen.
  - **Die Mehrdeutigkeit ist der Lerngegenstand, nicht der Störfall.** Gemessen über den
    ganzen Wortschatz hat eine Nomenform in **64 % der Fälle genau einen Kasus, in 32 %
    zwei**; die Zweideutigkeit verteilt sich auf fünf Muster, allen voran Dativ+Ablativ
    (232 Formen bis L20) und Nominativ+Akkusativ (140). **Beide Fächer gelten**, und die
    Rückmeldung nennt die zweite Lesart: „Richtig – und auch Ablativ." So lernt man sie beim
    Richtigliegen, nicht beim Scheitern.
    Daraus folgt auch, warum das Spiel **ohne Satz** auskommt: Im Satz wäre der Kasus
    eindeutig, aber dann übt man Syntax. Hier geht es um die Form allein – deshalb steht das
    Lemma dabei, sonst wäre *servīs* nicht entscheidbar (es könnte von *servāre* kommen).
  - **Die Fächer stehen in der SCHULREIHENFOLGE** (Nom–Gen–Dat–Akk–Abl) und nur so viele,
    wie die Lektionsauswahl kennt: zwei bis L5, drei ab L6, vier ab L7, fünf ab L9.
    `NounEngine.getKnownCases` liefert die Reihenfolge der EINFÜHRUNG (nom, akk, gen, abl,
    dat) – wer die übernimmt, hängt ein Regal auf, das keine Klasse aufsagt. Die
    Schwierigkeitskurve kommt damit umsonst aus dem Lehrgang: In L1 ist noch **jede** Form
    eindeutig.
  - **Gewichtet wird das PHÄNOMEN, nicht das Lemma** (Entscheidung des Fachlehrers).
    Ein Fehler bei *patribus* heißt meist nicht „ich kenne *pater* nicht", sondern „ich
    wusste nicht, dass Dativ und Ablativ Plural der konsonantischen Deklination gleich
    aussehen". Deshalb gibt es hier **kein `recordVocabAttempt`**: Der Leitner-Kasten in
    `progress.js` ist lemma-basiert und könnte nur das Wort häufiger ziehen.
    Der Schlüssel ist stattdessen **Deklination | Kasusmenge | Numerus** – gemessen ergibt
    das 14 Phänomene bis L5, 32 bis L20, 57 über den ganzen Wortschatz, jedes mit dutzenden
    Formen. Wer *patribus* verfehlt, bekommt *mātribus* und *servīs*. Die Gewichtung gilt
    für die laufende Runde; ein dauerhafter zweiter Kasten neben dem von `progress.js`
    gehört besprochen, nicht nebenbei gebaut.
  - **Der Takt klammert die menschliche Spanne ein** (7000 → 2000 ms, Faktor 0,96, sechs
    Plätze). Durchgerechnet in `latein-tests/probe-takt.js` gegen vier Tempi (2,2 / 3,2 /
    4,5 / 6,5 Sekunden je Rolle):
    - Der **Starttakt muss über der langsamsten Sortierzeit liegen**. Mit 4500 ms lag, wer
      6,5 s braucht, ab der ersten Rolle hinten: **6 Rollen in 46 Sekunden**. Und die Spanne
      war flach – 46 bis 67 Sekunden für alle. Nicht das Können entschied, sondern die Uhr.
    - Der **Anschlag muss unter der schnellsten liegen**, sonst endet das Spiel nie: Mit
      2200 ms kam das Modell auf **2066 Rollen in 77 Minuten**.
    Gemessen mit den heutigen Zahlen: **80 / 35 / 27 / 18 Rollen**.
    Dazu eine **Bremse**: Solange das Pult mehr als halb voll ist, zieht der Takt nicht
    weiter an – sonst wird es genau dann schneller, wenn man ohnehin nicht nachkommt.
  - **Keine Herzen.** Falsch einsortiert kostet Zeit, nicht Leben: Die Rolle kehrt aufs Pult
    zurück. Verloren wird nicht an einem Fehler, sondern daran, dass man nicht nachkommt –
    das verzeiht einzelne Patzer und bestraft Raten zuverlässig, weil es Plätze blockiert.
  - **Ziehen UND Tippen.** HTML5-Drag-and-Drop fällt aus: `dragstart` feuert auf iOS-Safari
    nie. Gebaut mit Pointer Events, dazu `touch-action: none` an der Rolle (sonst deutet der
    Browser das Ziehen als Scrollen) und `setPointerCapture` in `try/catch` (wirft es, bliebe
    der halbe Handler liegen und die Rolle unbeweglich).
  - **Die Beschriftung der Fächer liegt auf einem Pergamentband, nicht auf dem Holz.**
    Gemessen: `--ink` auf der Holzleiste nur **3,91**, auf Pergament 11,3. Dieselbe Lehre wie
    beim Bingo. Die Kopfleiste ist **deckend** (#241a10) statt durchscheinend – über einem
    Bild lässt sich kein Kontrast nachrechnen, weder von Hand noch von `pruefe-theme.js`.
  - Bild-Assets in `assets/scrinium/`. Das Pult wird per `border-image` gedehnt, Schnitt
    `0 164 0 165 fill` – **an pult.png gemessen** (linkes Bein bis x=164, rechtes ab x=736).
    Das Fach ist EIN Fach und wird zwei- bis fünfmal nebeneinandergesetzt; ein fertiges
    Fünferregal wäre ab Lektion 1 falsch.
  - **Modus 2: zehn Fächer – Kasus MAL Numerus** (Oktober 2026, gleich nachgereicht).
    Gefragt ist dann nicht mehr „welcher Fall", sondern „welche Form genau".
    - **Das Regal IST die Paradigmentabelle**: Spalten sind die Kasus, Zeilen Singular und
      Plural. Beschriftet wird **einmal am Rand**, nicht zehnmal im Fach – so bleibt Platz,
      und das Ablesen der Tabelle ist gerade die Übung. Die Fächer wachsen wieder mit dem
      Lehrgang: **2 bis L1, 4 ab L2** (Plural), 6 ab L6, 8 ab L7, **10 ab L9**.
    - **Zehn Fächer waren nicht selbstverständlich spielbar** – deshalb vorher gemessen
      (`latein-tests/probe-kasusnumerus.js`): Eine Form passt in **63 % der Fälle in genau
      ein Fach, in 32 % in zwei, nie in mehr als drei**. Das ist fast dieselbe Verteilung
      wie bei fünf Fächern – **schwerer wird der Modus durch die Auswahl, nicht durch die
      Zweideutigkeit**. Wäre eine Form in vier Fächern richtig, wäre es keine Aufgabe mehr;
      `test-scrinium.js` prüft genau das.
    - Die häufigsten Doppelbelegungen liegen **in derselben Zeile** (Dat.+Abl. Pl. 116-mal
      bis L12, Nom.+Akk. Pl. 57-mal, Dat.+Abl. Sg. 39-mal). Die eine, die die Zeilen kreuzt,
      ist **das *-ae* der a-Deklination**: *fīliae* ist Gen. Sg., Dat. Sg. UND Nom. Pl.,
      35-mal bis L12. Genau dort zahlt sich die Rückmeldung aus: Wer *fīliae* in den Genitiv
      Singular legt, liest „Richtig – und auch Dativ Singular und Nominativ Plural."
    - **Getrennte Bestleistung je Modus** (`rollen` und `rollen-numerus`). Zehn Fächer sind
      eine andere Aufgabe; eine gemeinsame Zahl wäre im leichteren Modus nie zu schlagen.
    - **Ein Fach ist seitdem `{ key, kasus, numerus, label }`**, nicht mehr ein Kasus-Kürzel.
      Im ersten Modus ist `numerus` null – dann zählt jede Form des Kasus, gleich welcher
      Zahl. Das Gegenstück im Gitter: `max-height: 100%` am Fach musste weg, sonst rechnet es
      gegen eine gedehnte Gitterzeile und schrumpft die Fächer auf 79 px (gemessen).
  - **Drei Trophäen, alle aus derselben Simulation abgeleitet** (`probe-takt.js`):
    *Archivmeister* (📜, 15/30/45/60 Rollen), *Tabellenfest* (🗂️, 10/20/32/45 – zehn Fächer
    brauchen länger je Rolle, also rückt dieselbe Leiter eine Stufe herunter) und
    ***Doppelblick*** (👀, 4/10/16/24 mehrdeutige Formen in einer Runde).
    Die dritte ist die eigentliche Lernmarke: 32 % aller Nomenformen sind mehrdeutig, in
    einer Runde von 40 Rollen also rund 13. Wer die sicher wegräumt, hat begriffen, dass eine
    Endung mehr als einen Fall tragen kann – und genau deshalb sortiert das Spiel
    mehrdeutige Formen nicht aus.
    Alle drei tragen `bereich: 'bestleistung'` **und** einen Eintrag in `BEST_ACHIEVEMENTS`;
    ohne den zweiten findet `recordBest` sie nie. `test-scrinium.js` prüft beides.
    Gezeigt werden sie **am Rundenende**, nicht während des Laufs – wie bei IssaJump, und
    deshalb bindet auch dieses Spiel `achievementToast.js` nicht ein.
  - **Der Anschlag musste von 2000 auf 1100 ms** (beim Setzen der Schwellen aufgefallen).
    Mit 2000 ms **verlor niemand mehr, der 2,0 Sekunden je Rolle schafft** – das Modell kam
    auf 2097 Rollen in 71 Minuten, bei 1,5 s auf 10 000. Der Anschlag lag also ÜBER der
    menschlichen Grenze, und in kleinen Lektionen mit nur zwei Fächern ist 2 s leicht zu
    unterbieten. Gemessen ändert sich **unterhalb von 1100 ms nichts mehr**: Die Leiter
    lautet 56 / 47 / 40 / 27 / 18 Rollen, und die drei langsameren Tempi sind von der
    Änderung gar nicht betroffen – der Takt zieht je EINGEORDNETER Rolle an, sie kommen nie
    in die Nähe des Anschlags.
    **Die Lehre ist dieselbe wie oben, nur andersherum:** Ein Anschlag, den ein Mensch
    unterbieten kann, macht aus dem Spiel eine Endlosschleife – und aus jeder Bestleistung
    eine Zufallszahl. Wer am Takt dreht, prüft beide Enden.
  - `test-scrinium.js` prüft Fächerzahl und -reihenfolge (mit Gegenprobe gegen die
    Engine-Reihenfolge), dass eine mehrdeutige Form in BEIDEN Fächern zählt, dass der
    Vokabelkasten schweigt (am Verhalten, nicht am Quelltext – im Quelltext steht das Wort
    in einem Kommentar), dass das Phänomen gewichtet wird und genug andere Wörter es teilen,
    und dass die Wiederholungsrunde sich nicht selbst füttert.
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
     - **Gefragt ist NUR ein Ablativ – und unter der Lösung steht, woran man ihn erkennt.**
       Hier stand zuerst das Gegenteil: Die Richtungsangabe im Akkusativ (`in`/`ad` + Akk.,
       Pontes L3) war absichtlich mit dabei, wegen des Kontrasts *in urbem* (wohin?) gegen
       *in urbe* (wo?). **Im Unterricht ist genau das durchgefallen** (Oktober 2026): Ein
       Modus mit dem Titel „Nur Ablativ: Welche Funktion?" fragte nach der Funktion eines
       Wortes, das gar kein Ablativ ist – gemessen in **40 von 240 Runden**, also jeder
       sechsten. Wer den Kasus gerade erst lernt, kann daraus nur schließen, die
       Richtungsangabe sei auch einer.
       `verfuegbareAdvKeys()` filtert deshalb auf `kasus === 'abl'`; der Knopf „Wohin?" ist
       aus der Reihe raus. **Im Satzglied-Modus bleibt die Richtungsangabe** – dort ist sie
       schlicht eine adverbiale Bestimmung, und die Frage nach dem Kasus stellt sich nicht.
       Der Kontrast ist nicht verloren, er steht jetzt **im Hinweis unter der Lösung**:
       Jeder Eintrag in `SentenceEngine.ADVERBIALE` trägt ein Feld `hinweis`, das sagt, WORAN
       man die Funktion erkennt – und das ist fast immer die Präposition oder ihr Fehlen
       (`in` + Abl. gegen `in` + Akk.; `ex`/`ab`/`dē` immer Ablativ; `cum` immer Ablativ;
       bloßer Ablativ bei einem Zeitwort = wann, bei einer Sache = womit). Der Fachbegriff
       allein beantwortet die Frage nicht, die eine 7. Klasse wirklich hat: „Woran hätte ich
       das sehen sollen?"
       `test-gating.js` prüft beides mit Gegenproben: dass über 240 Runden kein Nicht-Ablativ
       gefragt wird, dass die Engine die Richtungsangabe trotzdem noch bauen kann (sonst wäre
       der Test auch grün, wenn sie ganz verschwunden wäre), und dass der Hinweis wirklich in
       der Erklärung ankommt, die das Spiel zeigt.
     - **Eine EINZELNE Lektion ist der Sonderfall.** Der Modus stürzte ab, sobald
       jemand nur „Lektion 15" anklickte, statt einen Bereich zu wählen: Die
       Funktionswörter (hōra, silva, gladius …) verteilen sich über den ganzen
       Lehrgang, der Topf einer einzelnen Lektion enthält oft keines davon,
       `buildAblativRound()` gab `null` zurück und `nextQuestion()` las darauf
       `.words`. Gemessen: **28 von 29 Einzellektionen** stürzten ab. Jetzt rückt
       die Funktion reihum zur nächsten Funktion weiter, und `startGame()` probt
       vorher einmal und lehnt die Auswahl mit einem Hinweis ab, statt mitten im
       Spiel stehenzubleiben (dasselbe Muster wie `startDefense()` im Kastell).
       **Warum der Test das nicht sah:** Er hat immer `v.lesson <= L` gefiltert,
       also einen Bereich. Wer Spiele prüft, muss die Einzelauswahl mitprüfen –
       im Unterricht ist sie der Normalfall, nicht die Ausnahme.

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
- **Silentium.html** – **kein Spiel, sondern ein Werkzeug für die Lehrkraft** (September 2026,
  nach einer Idee des Fachlehrers). Es läuft auf EINEM Gerät, das im Raum steht oder mit der
  Lehrkraft mitwandert: Solange es still bleibt, kommt Besuch auf das Landgut der Cornelier;
  wird es zu laut, flieht alles auf einmal und die Stille-Strähne fällt auf null.
  Daraus folgt dreierlei, und das ist bewusst so:
  - **Kein Eintrag in den Vokabelkasten, keine Achievement-Zähler.** Stillsein ist keine
    Lernleistung, und die Zähler messen Lernleistung. `test-silentium.js` prüft, dass im
    Quelltext weder `recordVocabAttempt` noch `recordCategoryAttempt` vorkommt.
  - Die Sammlung liegt unter `ludi_silentium_gesehen` und gehört dem **Gerät**, also der
    Klasse davor – wie Bombas Bestleistung. Daneben steht unter `ludi_silentium_rekord` die
    **längste Stille, die dieses Gerät je gesehen hat**. Eigener Schlüssel, damit sie überlebt,
    wenn das Buch einmal geleert wird. Sie steht auf dem Start- und dem Schlussbild, **nicht in
    der laufenden Leiste**: Ein Ziel vor Augen motiviert, ein Ziel im Blickfeld während der
    Arbeit lädt zum Mitzählen ein. Geschlagen wird sie nur von einer längeren Strähne, nicht
    von einer längeren Stunde; `test-silentium.js` prüft das am Verhalten (400 setzen, 200
    darf nicht überschreiben, 500 muss heben) samt Gegenprobe, dass nur der wirklich
    geschlagene Rekord gefeiert wird.
  - **Die Ankunftszeiten streuen um ein Viertel – aber nicht bei den Seltenen.** Feste
    Sekunden machen aus der Stunde eine Stoppuhr: Wer zweimal dabei war, weiß, dass der
    Sperling nach zwanzig Sekunden kommt, und zählt mit, statt zu arbeiten. Gemessen tauschen
    dadurch in 91 % der Durchgänge benachbarte Gäste die Reihenfolge – die Streuung ändert
    also wirklich etwas und wackelt nicht nur.
    Die seltenen Gäste behalten ihre Minute auf die Sekunde: „Merkur schaut nach zehn Minuten
    vorbei" steht so auf dem Startbildschirm, und unberechenbar genug sind sie durch den
    Würfel. Das Buch sagt deshalb **„ab etwa 5 Min"** bei den sicheren und **„ab 10 Min, mit
    Glück"** bei den seltenen.
    **Gewürfelt wird EINMAL je Durchgang, beim Start** (`ankuenfteWuerfeln()`). Im Takt
    weitergewürfelt wäre die Schwelle eines Gastes keine Schwelle mehr, sondern ein Zittern
    um sie herum – derselbe Fehler wie beim Würfel der Seltenen.
    Wo sonst noch mit `ankunft` gerechnet wird, muss der **Rand** her, nicht der Mittelwert:
    Der Hinweis „Bei 10 Minuten sind N Gäste erreichbar" nimmt den spätestmöglichen
    Zeitpunkt, sonst stimmt die Zusage in genau den Durchgängen nicht, in denen der Würfel
    jemanden nach hinten schiebt.
  - Es steht **nicht als Karte zwischen den Spielen**, sondern als kleine Pille oben rechts
    im Hauptmenü (`#silentium-btn` in `theme.css`, das Gegenstück zum Haus-Knopf oben links).
  - **DIE REGEL, AN DER ALLES HÄNGT:** Ein seltener Gast wird **genau einmal** ausgewürfelt,
    nämlich wenn die Strähne seine Sekunde erreicht. Würfelte man im Takt weiter, wäre Merkur
    bei 33 % nach zehn weiteren Minuten praktisch sicher da – und die 33 % wären gelogen.
    Über 400 Durchgänge nachgemessen: lupa 48 % (Soll 50), Mercurius 33 % (Soll 33),
    Iuppiter 18 % (Soll 20).
  - **Zum Mikrofon:** Gemessen wird nur der Pegel (`AnalyserNode`, Effektivwert → dB). Es wird
    nichts aufgenommen, nichts gespeichert, nichts gesendet – es gibt keinen Server. Das steht
    sichtbar auf dem Startbildschirm, und der Test prüft, dass keine Aufnahme-Schnittstelle im
    Quelltext auftaucht. **Die Eichung nimmt den Median** über zehn Sekunden, nicht den
    Mittelwert: Ein einzelner rückender Stuhl während der Eichung würde den Mittelwert nach
    oben ziehen und die Schwelle für den ganzen Lauf verderben.
    Der Lautlos-Schalter stört hier nicht – er betrifft nur die Ausgabe. Deshalb ist das
    Schlussbild auch **sichtbar** und nicht hörbar (siehe Bomba).
  - **Die Empfindlichkeit ist ein ABSTAND, kein Pegel.** Die Zahl am Regler sagt, wie viel
    lauter als der geeichte Raum es werden darf – und weil ein dB-Abstand ein Verhältnis ist,
    gilt sie unabhängig davon, wie empfindlich das Mikrofon des jeweiligen Geräts ist.
    Der Bereich lief zuerst von 3 bis 20 und war damit zu streng: **20 dB über einem stillen
    Raum IST schon Zimmerlautstärke**, am obersten Anschlag stieß also eine ruhige
    Partnerarbeit bereits an die Grenze; und 3 dB unten liegen innerhalb dessen, worum ein
    stiller Raum von selbst schwankt. Jetzt **5 bis 30, Voreinstellung 14** (vorher 9).
    Orientierungswerte, in dB über einem stillen Klassenraum und aus der Entfernung des
    Lehrergeräts gemessen, nicht aus einem Meter:

    | Was im Raum passiert | dB über dem stillen Raum |
    |---|---|
    | Blättern, Stifte, Stuhlrücken | rund 8 |
    | flüsternde Klasse | 10–15 |
    | Zimmerlautstärke, ruhiges Gespräch | gut 20 |
    | normale Unterhaltung | knapp 30 |

    Je 6 dB ist doppelter Schalldruck. **Die Namen sind wichtiger als die Zahlen**
    (`SCHWELLEN_LAGEN`: sehr streng / streng / mittel / großzügig / sehr großzügig, jeweils
    mit einem Satz dazu): Eine Lehrkraft denkt in „Flüsterphase", nicht in Dezibel.
    `test-silentium.js` prüft, dass **beide** Regler – Startbild und Pause – dieselben Grenzen
    haben (zwei Regler, die auseinanderlaufen, fallen sonst nie auf), dass jede Stellung einen
    Namen trägt und dass der oberste Anschlag über der Zimmerlautstärke liegt.
  - **Elf der vierzehn Gäste haben ein Bild.** Ohne sind noch die drei, die eine Entscheidung
    brauchen: `cornelii` (muss zur Familie im Lehrbuch passen), `mercurius`, `iuppiter`. Wer
    keines hat, erscheint als Pergamentplättchen mit seinem lateinischen Namen – der Ersatz ist
    vorgesehen, kein Notbehelf. Der Weg: Canva liefert 200×200 auf Magenta, `freistellen.js`
    macht daraus ein palettiertes PNG von 4–12 KB. **Nur Hintergründe gehen so nicht** – das
    Original ist signiert, die Vorschau mit 200 px zu klein.
    **Issa ist dasselbe Bild wie im Sprungspiel**, nur kleiner gerechnet (`issa_idle.png`,
    beschnitten und auf 160 px gebracht). Zwei Zeichnungen derselben catella wären ein Bruch,
    den die Klasse sofort bemerkt.
    `test-silentium.js` prüft jede Bildkennung gegen die Gästeliste und jede Datei auf
    Durchsichtigkeit. Grund: Ein Tippfehler in der Bildliste fällt sonst NICHT auf – der Gast
    erscheint dann einfach als Plättchen, und das ist ja der vorgesehene Ersatz. Gemerkt würde
    es erst in der Klasse.
  - **Wie groß jemand gezeichnet wird, steht nicht im Datensatz, sondern wird gerechnet.**
    Jeder Gast trägt seine wirkliche Höhe in Zentimetern (`hoehe`), `groessenFaktor()` macht
    daraus den Zeichenfaktor. Vorher standen dort von Hand geschätzte Zahlen, und die waren
    auseinandergelaufen: Der **Esel war mit 73 Bildpunkten je Meter Natur der kleinste Gast**
    der Wiese, der Sperling mit 340 der größte – gemessen. Das sieht man sofort, auch ohne
    sagen zu können, woran es liegt.
    Streng maßstäblich wäre aber auch falsch: Neben einem Esel von 130 Punkten bliebe der
    Sperling 16 Punkte hoch und wäre vom Pult aus nicht mehr zu finden. Deshalb die Wurzel
    dazwischen (`GROESSE_STAUCHUNG = 0.55`) – im Bild 5,7×, in der Natur 23×.
    `test-silentium.js` prüft die Reihenfolge (größer im Bild = größer in der Natur) und dass
    die Stauchung eine Stauchung bleibt: nicht flach, nicht maßstäblich.
  - **Drei Regeln dafür, wo jemand hintritt.** Alle gemessen, und alle fallen nicht auf,
    wenn sie fehlen – es erscheint ja nichts Falsches, sondern nichts.
    - **Niemand tritt unter den Bildrand.** Der Hintergrund wird formatfüllend gezeichnet und
      auf breiten Schirmen oben und unten beschnitten. Gemessen bei 1280×663: Rahmen 1280×859,
      je 98 Punkte fallen weg, **13 % der Wiese liegen unter der Fläche**. Wer dort eintrat,
      war schlicht nicht da. `sichtbareWiese()` schneidet die Spanne am Ausschnitt zu; die
      TIEFE rechnet weiter mit `WIESE_HINTEN`/`WIESE_VORN`, denn die gehören zum Gelände und
      nicht zum Schirm. Die beiden iPad-Formate waren nie betroffen – es traf den Beamer.
    - **Wer flach am Boden liegt, bleibt vorn** (`nah: true`, bisher nur die Eidechse). Sie
      misst 160×47 Bildpunkte; über die Höhe bemessen und in der Breite gedeckelt wird daraus
      in der Bildmitte ein Streifen von 69×20 Punkten, ganz hinten einer von 28×8. Ein Gast,
      den niemand findet, ist kein Fund. Zur sonnenwarmen Mauer im Vordergrund passt sie
      ohnehin besser als in die Ferne.
    - **Der Platz wird ausgesucht, nicht gewürfelt.** `platzSuchen()` schlägt vierzehn Plätze
      vor und nimmt den mit der größten Lücke – gerechnet in Bildpunkten und von Rand zu Rand,
      damit zwei Sperlinge näher beieinander stehen dürfen als zwei Esel. Gemessen über 500
      volle Wiesen mit elf Gästen: **gewürfelt überschnitt sich in 88 % der Wiesen mindestens
      ein Paar** (im Schnitt 2,1 Paare, engste Lücke −27 Punkte), ausgesucht sind es 0 % und
      +49 Punkte. Auf dem Schirm sieht Klumpen nicht nach Zufall aus, sondern nach einem Fehler.
    Die Gegenprobe gehört bei beiden dazu: ohne sie wäre der Test auch grün, wenn gar niemand
    mehr in den Hintergrund käme und die Tiefe eingeebnet wäre.

Drei davon sind **Gruppenspiele** und folgen deshalb anderen Regeln als der Rest: Sie gehören
keiner Person, tragen im Hauptmenü **kein `progress-badge`**, und ihre Vollbild-Layouts schalten
das `min-height: 100vh` aus `theme.css` mit `min-height: 0` ab (siehe Fallstricke unten).

**Die Schleife im Hauptmenü, die die Fortschrittsbänder füllt, muss `if (!badge) return;`
enthalten.** Ohne das warf sie an der ersten Karte ohne Band - und `forEach` bricht dann GANZ
ab: **Sieben Karten dahinter** (Kastell, Villa, Pronomina, ViaRomana, Pendel, Arcus, Quiz)
blieben leer. Niemandem aufgefallen, weil ein leeres Band aussieht wie ein leeres Band.
Gefunden beim Einhängen des Bingos, `test-bingo.js` hält es fest.

- **Fliegenklatsche.html** – Brettspiel am Beamer für die ganze Klasse. Nicht überlappende
  Wortkacheln auf Marmortafeln (`assets/ui/marmor.png` per `border-image`, Randbreiten in **em**,
  damit der Rahmen von 9 bis 64 px Schrift mitwächst). Zwei Teams, Punkte von Hand.
  Kein Richtig/Falsch, deshalb **kein** `recordVocabAttempt`.
- **Bingo.html** – **Vokabel-Bingo** (Oktober 2026). Das erste Spiel, bei dem die ganze Klasse
  GLEICHZEITIG am eigenen Gerät spielt – und es braucht trotzdem keinen Server. Eine Datei,
  zwei Rollen: *Beamer: Wörter aufrufen* (Lehrkraft, ruft die lateinischen Wörter auf, führt
  die Aufrufliste) und *Mein Spielfeld* (4×4-Karte mit deutschen Bedeutungen).
  **Abgestimmt wird zwischen den Geräten NICHTS ausser der Lektionsspanne** – alle ziehen aus
  demselben Topf, und mehr als „bis Lektion 12" muss nicht synchron sein. Genau daran hängt,
  dass das Spiel ohne Backend funktioniert.
  - **Der Topf enthält nur Wörter mit EINDEUTIGER Bedeutung.** Sonst steht auf der Karte
    „rufen", die Lehrkraft ruft *vocāre* – und die Kachel stammte von *clāmāre*. Beim
    Nachprüfen stünde das falsche Wort da, und niemand könnte entscheiden, wer recht hat.
    Genommen wird die **erste** Bedeutungsangabe, abgeschnitten vor Komma, Semikolon und
    Klammer: „arbeiten, sich bemühen; (+ Abl.) an etwas leiden" passt auf keine Kachel,
    „arbeiten" schon. Gemessen kostet das wenig: bis L12 fallen 42 von 386 Wörtern weg
    (*et/-que/atque* für „und", *caedere/occidere* für „töten"), bis L22 68 von 625.
  - **Bei Bingo nennt die Karte die vier LATEINISCHEN Wörter ihrer Reihe.** Das ist die
    einzige Brücke zwischen Schülergerät und Aufrufliste – die Lehrkraft schlägt die vier
    nach, und fertig. Ohne diese Zeile müsste sie sechzehn deutsche Kacheln zurückübersetzen,
    und ein falsch gerufenes Bingo wäre nicht zu widerlegen. Ein Kartencode mit gesätem
    Zufall wäre die aufwendigere Alternative gewesen; vier Wörter tun es auch.
  - **Kein Vokabelkasten**, wie bei der Fliegenklatsche und aus demselben Grund: Das Gerät
    kann nicht prüfen, ob ein Kreuz zu Recht gesetzt wurde. `test-bingo.js` prüft das.
  - Die Bedeutung des aufgerufenen Wortes bleibt **verdeckt** und kommt nur auf Knopfdruck –
    sie gleich mitzunennen nähme dem Spiel die Übung.
  - Die Kacheln sind dieselben Marmortafeln wie auf dem Brett der Fliegenklatsche
    (`assets/ui/marmor.png` per `border-image`, Randbreiten in **em**). Markiert heisst
    gestempelt: eine Scheibe in `--pompeji` UNTER der Schrift (gemessen 7,41 für `--ink` auf
    der gestempelten Fläche, 6,34 für den Rand auf dem Marmor).
  - **Das aufgerufene Wort liegt auf der Schriftrolle, nicht auf der blanken Wand** – dieselbe
    dreiteilige Rolle wie das Satzfeld in Arcus. Aus dem Unterricht gemeldet und dann gemessen:
    Die Wand reicht von Weiss in den Steinen bis fast Schwarz in den Fugen, `--pompeji` steht
    darauf **zwischen 7,53 und 2,54** – je nachdem, wo ein Buchstabe gerade hinfällt. Am Beamer
    ist das Wort dann mal lesbar und mal nicht. Auf dem Pergamentband sind es gleichmässige
    **6,16** (und 11,24 für die Bedeutung in `#3b2a18`). Randbreiten in `clamp()`, damit die
    Rolle vom iPad bis zum Beamer mitwächst – bei festen Pixeln wäre die wellige Kante auf dem
    Beamer ein Strich.
  - **Die Fusszeile bricht um** (`flex-wrap`). Ohne das standen die drei Knöpfe auf einem
    375-px-Schirm nebeneinander von −45 bis 420: Der wichtigste, „Nächstes Wort", ragte links
    hinaus und war halb unerreichbar – und weil der Körper `overflow: hidden` hat, gab es nicht
    einmal eine Bildlaufleiste, die es verraten hätte.
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

## Die Familie Cornelia

Aus dem Lehrbuch, mit den Längen so, wie sie dort stehen. Sie taucht in Silentium auf
und wird in weiteren Spielen gebraucht – **hier nachschlagen, nicht aus dem Gedächtnis
schreiben.**

| Rolle | Name |
|---|---|
| avus | Pūblius Cornēlius Fīrmus |
| pater | Quīntus Cornēlius Prīscus |
| māter | Valeria |
| fīlius | Aulus Cornēlius Faustus |
| fīlia | Cornēlia |
| serva | Dēlia |
| servus | Lycus |
| catella | Issa |

Die catella heißt **Issa** – dieselbe wie im Sprungspiel. Martial besingt eine Hündin
dieses Namens, und darauf spielt auch das Spiel an.

## Wichtige Konventionen & bekannte Fallstricke

- **Makronfehler kommen vor**: In der Vokabeldatenbank fanden sich mehrfach fehlende Längen
  (*instruere*→*īnstruere*, *multi*→*multī*, *amicus*→*amīcus*). Bei Unsicherheit lieber
  nachschlagen/prüfen als blind übernehmen.
- **`gram_clue`-Format für Nomen-Ausnahmen**: i-Stamm-Gen.-Pl.-Ausnahmen stehen als
  `"(Gen. Pl. XXX)"` im `gram_clue`-Text und werden von `NounEngine` automatisch geparst – NICHT
  hartkodieren, sondern im Datensatz ergänzen (z.B. bei *mors*, *bōs* nachträglich gefunden).
- **Defektive Nomen** (*vīs* u.a.) liefern `null` für fehlende Kasus – IMMER prüfen, bevor eine
  Form als Distraktor/Zielwort verwendet wird, sonst tauchen `null`/`undefined` im UI auf.
- **Pluralia tantum haben GAR KEINEN Singular** (Oktober 2026 repariert). Das abschließende
  `Pl.` in `middle` (`"ruīnārum f. Pl."`) sagt: Die Form davor ist der Genitiv **Plural**.
  `parseMiddle` hat den Marker zwar erkannt, aber **weggeworfen** – der Genitiv Plural ging
  als `genSg` weiter, und die Deklination zog ihm die Singular-Endung ab. Aus *ruīnārum*
  wurde der Stamm *ruīnār-* und daraus *ruīnārae*, *ruīnārārum*, *ruīnāram*.
  **Gemessen: 20 von 24 Pluralia tantum waren betroffen** – *castra* → *castrōrua*,
  *litterae* → *litterārae*, *vīrēs* → *vīriēs*, *arma* → *armōrua*. Diese Nicht-Wörter
  standen im Formen-Kastell als Zielform UND als Distraktor. Gefunden wurde es nicht beim
  Lesen, sondern weil in Scrīnium *„ruīnārārum"* auf einer Rolle stand.
  Jetzt gilt: **Singular komplett `null`** (wie bei *vīs* die fehlenden Kasus), und zwei
  Formen werden gar nicht geraten – der Nominativ Plural IST das Lemma, der Genitiv Plural
  steht in `middle`. Abgeleitet werden nur Dativ, Akkusativ und Ablativ.
  Mehrwortige Lemmata (*patrēs cōnscrīptī*) lassen sich nicht über einen Stamm beugen; dort
  bleiben Dativ/Akkusativ/Ablativ `null` – **lieber eine Lücke als eine erfundene Form**.
  Folge, die man kennen muss: Die `SentenceEngine` verlangt in `mitKasus` Singular UND
  Plural, also fallen Pluralia tantum jetzt aus dem Satzbau heraus. Das ist richtig so.
  `latein-tests/nomen-goldstand.js` hat den Umbau abgesichert: 342 Nomen vorher aufgenommen,
  **genau 24 geändert, 318 unberührt**. Dabei fiel auf, dass `test-caesar.js` stillschweigend
  annahm, jedes Nomen habe einen Nominativ Singular – die Annahme war die veraltete, nicht
  der Code.
- **Testverfahren**: Jede Änderung wird vor Auslieferung mit jsdom getestet (Syntax-Check per
  `node --check`, dann funktionaler Test durch Laden der HTML-Datei mit `runScripts: 'dangerously'`).
  localStorage funktioniert unter `file://`-URLs in jsdom nicht zuverlässig – bei Bedarf mit
  In-Memory-Ersatz oder `http://`-Basis-URL umgehen.
  Testumgebung liegt in `C:\Users\konra\latein-tests` (Node + jsdom), bewusst AUSSERHALB des
  OneDrive-Ordners – `node_modules` gehört nicht in die Synchronisierung und nicht ins Repo.
  Wiederverwendbare Testbasis dort: `harness.js` (`loadScripts([...])` → `{ ev, errors }`).

  **Drei Tests prüfen quer über alle Spiele** (Oktober 2026, entstanden aus gehäuften
  Fehlermeldungen; sie haben beide Ursachen gefunden, die die bestehenden Tests nicht sahen):
  - `test-start.js` – startet JEDES Spiel über seinen echten Weg, mit gemocktem Lektions-
    filter, für jede einzelne Lektion und für Bereiche. Gesucht wird nur: Wirft es, statt
    sauber abzulehnen?
  - `test-antworten.js` – spielt Issa und das Kastell über jede Auswahl durch und prüft, was
    eine Schülerin SIEHT: vier Antworten, keine leere, **keine zwei, die gleich aussehen**,
    genau eine richtige.
  - `test-issa-lauf.js` – taktet den echten Spielablauf Bild für Bild (Physik, Kamera,
    Gegenstände, Herzverlust, Wiederholung) über 40 Auswahlen.

  **Für einen reinen Umbau: erst aufnehmen, dann vergleichen.** Als der Formenkatalog aus
  `Kastell.html` nach `formen.js` wanderte, durfte sich NICHTS ändern. Dafür nimmt
  `latein-tests/formen-goldstand.js` vorher auf, was das Kastell zu 640 Wort-Lektions-
  Kombinationen erzeugt (35 249 einzelne Formen mit Label, Gewicht und Merkmalen), und
  vergleicht danach Zeichen für Zeichen. Gegenprobe vorweg: Ein einziges geändertes Zeichen
  in einem Label schlug in 128 Einträgen durch – erst damit war die Aufnahme etwas wert.
  Die Nomen-Slots entstehen inline und werden sofort weitergereicht; statt sie nachzubauen
  (was genau die Fehlerquelle wäre, die der Test finden soll) fängt die Aufnahme die
  Übergabe an `buildRoundFromSlots` ab.
  **Der Goldstand ist ein WERKZEUG, kein Dauertest** – er würde den Katalog einfrieren, und
  der soll sich ändern dürfen. Den Vertrag prüft `test-formen.js`: dass jeder Slot eine
  echte Form, ein Label und Merkmale aus bekannten Mengen hat, und dass das Gating hält –
  jede Probe mit Gegenprobe, sonst wäre „kein Passiv vor L15" auch grün, wenn es gar kein
  Passiv mehr gäbe.
  **Und die Grenze des Verfahrens, teuer gelernt:** Der Goldstand deckt nur ab, was er
  AUFRUFT. Beim Herausschneiden ging `buildVerbRound` mit verloren – es stand zwischen zwei
  Blöcken, die beide wegsollten. Der Goldstand blieb grün, weil er `verbSlots` direkt
  aufruft und die Runde gar nicht baut; gefunden haben es `test-kastell.js` und
  `test-gating.js`. Ein Goldstand ersetzt die anderen Tests nicht, er ergänzt sie.

  **Was daran neu ist:** Die bisherigen Tests prüften, ob ein Spiel das RICHTIGE tut. Diese
  drei prüfen, ob es etwas FALSCHES zeigt – und genau dort lagen beide Fehler. Keiner von
  beiden war ein Absturz; kein einziges Spiel stürzt ab. Wer der Fehlermeldung „es kommen
  Fehler" nachgeht, sucht deshalb besser nach dem, was auf dem Schirm steht, als nach einer
  Ausnahme im Protokoll.
  Zwei Fallstricke, die dabei jedes Mal zuschlagen:
  - **`window.eval(quelltext)` funktioniert NICHT** zum Laden der Projektdateien. Deren Globals
    (`globalVocabularyPool`, `NounEngine`, `VerbEngine` ...) sind top-level `const` – solche
    Bindings landen weder auf `window`, noch überleben sie den eval-Scope. Die Dateien müssen als
    echte `<script>`-Tags in die Seite; der Zugriff läuft danach über `window.eval('name')`.
  - **Beim Inlinen die Sequenz `</script` escapen.** `nounEngine.js`, `verbEngine.js`, `progress.js`
    und `achievementToast.js` enthalten sie im Einbinde-Hinweis-Kommentar. Im Browser harmlos (die
    Dateien werden per `src` geladen), beim Inlinen bricht der HTML-Parser dort das Script-Tag ab –
    die Datei lädt dann still nur zur Hälfte.
  - **Patch-Skripte: erst auf LF vereinheitlichen, DANN auf die Zeilenenden der Datei
    bringen.** Wer einen schon mit CRLF verbundenen Text noch einmal umwandelt, erzeugt
    `\r\r\n`. Beim Lesen fällt das nicht auf, im Browser auch nicht – aber git erkennt die
    Datei dann nicht mehr als Text (`git ls-files --eol` zeigt `i/-text`), die Normalisierung
    von `core.autocrlf` fällt aus, und der nächste Commit schreibt die ganze Datei neu: bei
    `progress.js` waren es 513 Zeilen raus und 513 rein für 79 wirklich geänderte. Nach einem
    Commit mit auffällig vielen Zeilen lohnt ein Blick in `git show --stat`.
  - **Backticks und `${...}` überleben die Bash-Zeile nicht.** In einem `node -e "..."` frisst
    die Shell beides – aus einem Kommentar wird eine leere Klammer, aus einer Vorlagenzeichen-
    kette ein Aufruf, den es nicht gibt. Beides ist in dieser Sitzung zweimal passiert.
    Patch-Skripte deshalb als DATEI schreiben und dann `node datei.js` aufrufen.
  - **Was ein EREIGNIS anfassen kann, bekommt seinen Wert bei der DEKLARATION** –
    nicht erst beim Spielstart. In IssaJump hingen `keydown`/`keyup` seit dem Laden am
    Fenster, `keys` bekam sein `{}` aber erst in `resetGame()`. Zwischen Laden und
    Rundenstart war es `undefined`, und **jeder Tastendruck auf dem Startbildschirm oder in
    der Lektionsauswahl warf**:

    ```
    TypeError: undefined is not an object (evaluating 'keys[e.key] = true')
    ```

    Von einer Schülerin gemeldet (Oktober 2026, mit Bildschirmfoto). Also genau dort, wo
    jede Stunde anfängt und wo jemand ungeduldig auf die Pfeiltaste drückt – und deshalb
    häufig. `test-vorm-start.js` drückt jetzt Tasten, dreht das Gerät und klickt alles
    **Sichtbare** an, bevor irgendetwas begonnen hat, und zwar auf jeder Seite des Projekts.
    In der Gegenprobe meldet er den Originalfehler 88-fach.
    **Beim Erweitern dieses Tests:** Nur anfassen, was ein Mensch auch treffen kann. Die
    erste Fassung klickte stumpf jeden Knopf im Dokument – auch die Antwortknöpfe, die vor
    der ersten Runde ausgeblendet sind, und die hinter dem Lektionsfilter-Overlay. Neun
    falsche Alarme, kein einziger echter Befund.
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

- **Die Kopfzeile eines Spiels** ist `.seiten-titel` plus `.seiten-untertitel` aus
  `theme.css` – bewusst als Klasse, nicht als `h1`-Regel: Das Hauptmenü setzt seinen Titel
  in Marmorcreme auf die Bronzetafel, die Trophäenseite ohne Versalien. Eine `h1`-Regel
  im Theme würde beiden dazwischenfunken.

  Die zwei Klassen standen dort schon – und **keine einzige Datei hat sie benutzt**,
  während jedes Spiel seine eigene `h1`-Regel trug, sechs davon Zeichen für Zeichen gleich.
  Eine tote Regel in `theme.css` ist schlimmer als gar keine: Sie sieht aus, als wäre die
  Sache geregelt, und der nächste baut daneben seine eigene. `pruefe-theme.js` meldet
  deshalb seit jetzt auch **Klassen, die kein HTML benutzt** (Regel 7).

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
| **Caesar (36–42)** | **Lektüre** – keine Lektionen, sondern die sieben Kapitel von *BG* I 1–7 | |

Wo diese Zahlen im Code stehen: `VerbEngine.TEMPUS_LESSON_AKTIV/_PASSIV`, `INFINITIV_LESSON`,
`IMPERATIV_LESSON`, `PPA_LESSON`, `KONJUNKTIV_LESSON`, `GERUNDIUM_LESSON`, `GERUNDIVUM_LESSON`
sowie `SentenceEngine.ATTRIBUT_LESSON/ADVERBIAL_LESSON/DATIVOBJEKT_LESSON/PASSIV_LESSON`.
`latein-tests/test-gating.js` prüft alle 22 Konstanten gegen diese Tabelle und dazu, dass die
erzeugten Sätze pro Lektionsgrenze nichts Verfrühtes enthalten.

## Offene Punkte / auf der Liste

- **Falsch beantwortetes am Rundenende wiederholen** – GEBAUT (September 2026). Von den
  Schüler:innen gewünscht: Nach der letzten Frage nicht einfach zur Auswertung, sondern die
  danebengegangenen Vokabeln noch einmal durchgehen.

  Die Buchführung liegt in `review.js`, nicht zehnmal in den Spielen. `progress.js` hält
  nur den dauerhaften Leitner-Kasten; `getWeakVocab()` ist etwas anderes, nämlich die
  dauerhaft schwachen Wörter über alle Sitzungen.

  **Mein Einwand gegen das Zusammenlegen war falsch.** Ich hatte argumentiert, die Spiele
  merkten sich Verschiedenes – eine Vokabel, eine ganze Runde, eine Frage samt Fragetyp –
  und daran müsse eine gemeinsame Fassung scheitern. Das stimmt nicht: Verschieden ist,
  wie eine Frage AUSSIEHT und wie sie wieder gestellt wird. Die Buchführung ist überall
  dieselbe, und für sie ist der gemerkte Gegenstand undurchsichtig.

  **Was das strukturell bringt:** `LudiReview.merken()` tut nichts, solange die
  Wiederholung läuft. Damit kann die zweite Runde sich nicht mehr selbst füttern – bisher
  war das eine Regel, die zehn Dateien einhalten mussten, indem jede ihr
  `missedItems.push` an `!isReviewMode` hängte. Eine davon zu vergessen hieße: eine
  Runde, die nie endet. Ebenso sagt `zaehltInDenKasten()` an genau einer Stelle, was
  der Fachlehrer entschieden hat.

  Eine Ausnahme gibt es: Issa hat ZWEI Zeiger, weil die Plattformen für die nächsten
  Wörter schon nachwachsen, während noch bei den unteren geantwortet wird. Der zweite
  Zeiger gehört dem Spiel; `LudiReview.liste()` gibt ihm die Warteschlange lesend heraus.
  - **Entschieden (Fachlehrer):** Die Wiederholungsrunde zählt **nicht** in den Leitner-Kasten
    ein. Begründung: Sonst ginge der Fortschritt zu schnell – wer ein Wort erst im zweiten
    Anlauf und mit der Antwort noch im Kopf trifft, hat es nicht gekonnt.
    Technisch heißt das: in der zweiten Runde **kein** `recordVocabAttempt`.
  - **Gebaut in allen zehn Spielen mit Vokabelkasten.** Draußen bleiben Bomba (das Gerät
    wandert im Kreis, die Runde endet mit dem Knall), die Fliegenklatsche (kein
    Richtig/Falsch) und Circus' Kartenmodus (der hat kein Ende, sondern läuft, bis jemand
    zurück ins Menü geht – es gäbe keinen Moment, an dem sich die Fehler anbieten ließen).
  - **Entschieden (Fachlehrer): feste zweite Runde.** EIN Durchgang durch die Fehler, dann
    Schluss – nicht so lange, bis alles sitzt. Daraus folgt, dass die Wiederholung sich
    nicht selbst füttern darf: Jedes `missedItems.push` hängt an `!isReviewMode`, sonst
    liefe sie im schlimmsten Fall endlos. `test-wiederholung.js` prüft beides.
  - **Was in der Wiederholung sonst noch ruht**, je Spiel verschieden und jeweils aus
    demselben Grund – das Spiel ist entschieden, wiederholt wird nur noch:
    Kastells Mauerstärke, Villas Baufortschritt (sonst wäre sie zweimal fertig), Circus'
    Wagen und Gegner samt Kartenuhr, Duells Herzen und Countdown, Issas Herzen
    (mit drei Herzen wäre bei drei Fehlern Schluss, statt die Liste durchzuspielen).
  - **Die Entscheidung stand da, umgesetzt war sie nicht.** Alle fünf riefen
    `recordVocabAttempt` ungeschützt auf – der Rest der Runde war sauber getrennt
    (Mauerstärke, Punkte, `missedItems` hingen überall an `!isReviewMode`), nur der
    Kasten nicht. Kastells Endtext behauptete sogar „Was diesmal wieder falsch war,
    bleibt auf Rot", was damit nur zufällig stimmte. `test-wiederholung.js` nagelt es
    jetzt fest, und zwar am Verhalten: Spiel starten, antworten (der Kasten MUSS sich
    melden), `startReview()` über den echten Weg, wieder antworten (er darf NICHT).
    Die Gegenprobe gehört dazu – ohne sie wäre der Test auch grün, wenn ein Spiel den
    Kasten nie bedient.
  - **Entschieden (Fachlehrer): Die Achievement-Zähler laufen in der Wiederholung
    WEITER**, anders als der Vokabelkasten. Der Unterschied ist der Zweck: Der Kasten
    steuert, welches Wort wie oft drankommt – da wäre ein Treffer mit der Antwort noch
    im Kopf irreführend. Die Trophäen zählen Fleiß, und wer seine Fehler nochmal
    durchgeht, hat den Fleiß aufgebracht.
    Das steht als Kommentar an allen fünf `recordCategoryAttempt`-Stellen, direkt unter
    dem abgeschalteten `recordVocabAttempt` – sonst liest es sich wie ein Vergessen und
    wird beim nächsten Mal „mitrepariert".

- **Klassische Vokabelspiele digitalisieren.** Vom Fachlehrer ausgewählt (September 2026),
  noch nichts davon gebaut, Reihenfolge offen. Der harte Filter für alle: kein Server, kein
  Login – nichts darf Geräte untereinander abstimmen müssen. Jedes Spiel läuft entweder an
  EINEM Gerät oder am Beamer für alle.
  - ~~Vokabel-Bingo~~ – **gebaut** (Oktober 2026), siehe „Aktive Spiele" oben.
  - ~~Bomba~~ – **gebaut**, siehe „Aktive Spiele" oben.
  - **Memory.** Latein ↔ Deutsch, zu zweit an einem iPad. Das ruhige Gegenstück zur
    Fliegenklatsche.
  - **Heißer Stuhl.** Die Klasse sieht das Wort am Beamer, eine Person nicht und muss es
    aus den Umschreibungen erraten.
  - **Quartett.** Vier Wörter eines Sachfelds sammeln. **Hier stand bis Oktober 2026, das
    hänge an denselben Sachfeldern wie „Semantik Stufe 2" – ein Datenbestand, zwei Zwecke.
    Das ist falsch, und zwar an echten Daten geprüft.** Ein THEMATISCHES Feld „Krieg", wie
    Quartett es braucht, enthält im vorhandenen Wortschatz:

    | | |
    |---|---|
    | *imperātor, mīles, hostis, exercitus* | Personen |
    | *gladius, arma* | anfassbare Dinge |
    | *castra* | ein Ort |
    | *bellum, pūgna, victōria* | Abstrakta und Ereignisse |

    Für den Satzbau sagt das **nichts**: *gladium ferre* geht, *victōriam ferre* geht als
    Wendung, *castra ferre* nicht. Die thematische Achse und die Achse, die Sätze rettet,
    sind zwei verschiedene Achsen. Quartett braucht also ein **eigenes, zweites Feld** an
    den Nomen – die vorhandenen `feld`-Werte helfen ihm nicht.
  - Noch in der Diskussion: **Montagsmaler**. Das Hindernis ist die Wortauswahl – nur ein
    Teil des Wortschatzes ist zeichenbar. `belebt` hilft dabei NICHT: unter `belebt: "sache"`
    stehen *culīna*, *tunica* und *statua* neben *ōtium*, *labor*, *mors* und *gaudium*.
    **`feld` hilft weiter, reicht aber nicht**: `ding` und `ort` sind fast durchweg zeichenbar,
    `abstrakt` fast durchweg nicht – damit ist die Auswahl grob vorsortiert. Die Entscheidung
    „kann man das malen?" bleibt trotzdem eine eigene.

- **Caesar-Bedeutungen bekannter Wörter** – GEBAUT (Oktober 2026). Einige Wörter stehen längst
  im Pontes-Teil, heißen bei Caesar aber etwas anderes. **Ein zweiter Eintrag mit demselben
  Lemma wäre der falsche Weg** – zwei Einträge für *contendere* mit verschiedener Bedeutung
  sind genau der Fehler, den `bedeutung.js` gerade behoben hat: In einem Topf, der beide
  enthält, stünde die eine richtige Übersetzung als falsche Antwort auf die andere.
  - Deshalb trägt der vorhandene Eintrag ein Feld **`meaningAb: { lesson, meaning }`**, und
    `LudiBedeutung.fuer(eintrag, maxLektion)` wählt danach aus. Die Spiele merken sich dafür
    die höchste gewählte Stufe (`maxSelectedLesson` aus der Lektionsauswahl).
  - **Entschieden (Fachlehrer): erst ab Caesar.** Wer bis L31 wählt, lernt *contendere* als
    „behaupten" und sonst nichts – die Lektüre-Bedeutung erscheint erst ab Stufe 36.
  - **Beim VERGLEICHEN zählen beide Lesarten** (`kernSinne` vereinigt sie). Das ist die
    vorsichtige Richtung: „eilen" darf unter keiner Auswahl als falsche Antwort auf
    *contendere* danebenstehen, auch wenn gerade „behaupten" gefragt ist.
  - Betroffen ist bisher **genau ein Wort**: *contendere* (BG I 1 *contendunt* „kämpfen",
    BG I 7 *contendit* „eilt"). *fīnēs* brauchte nichts – es steht schon seit L28 mit
    „die Grenze, das Gebiet" im Wortschatz. Wer ein weiteres Wort ergänzt, trägt `meaningAb`
    nach; `test-bedeutung.js` prüft jedes Wort mit diesem Feld automatisch mit.

- **Semantik Stufe 2a: die Objektseite, grobe Achse** – GEBAUT (Oktober 2026). Stufe 1
  (Belebtheit des Subjekts) hatte die Quote unmöglicher Sätze von 41,5 % auf 0 gedrückt;
  die Objektseite war ungeprüft – `baueObjekt()` griff blind in den Topf.
  - **Die Nomenseite war schon fertig.** `belebt` steht an allen 342 Nomen. Gefehlt hat nur
    die Erwartung am Verb – deshalb kostete diese Stufe ein einziges neues Feld.
  - **`objArt`** (`"belebt" | "sache"`) am Verb, für den Akkusativ. **Fehlt es, ist beides
    recht.** Von 229 Akkusativverben verlangen **54 ein Lebewesen, 105 eine Sache, bei 70
    ist es egal**. Die Einstufung liegt als `latein-tests/objekt.json` (dort korrigieren,
    `einbau-objektart.js` schreibt sie nach `vocabulary.js`).
  - **Leitsatz bei der Einstufung: im Zweifel „egal".** Eine zu enge Regel nimmt richtige
    Sätze weg, eine fehlende lässt nur den alten Zustand bestehen – das ist die harmlosere
    Fehlerrichtung. *regere, servāre, dēfendere, tuērī, laudāre, dīligere* stehen bewusst
    auf egal: Sie gehen mit Person UND Sache.
  - **Wie weit gegengelesen** (Oktober 2026): Die **22 strittigen Einträge** – die mit einer
    Notiz in `objekt.json`, darunter *arcēre, perturbāre, sequī, obsidēre, parere, afficere* –
    hat der Fachlehrer geprüft und **unverändert bestätigt**. Die übrigen 137 sind meine
    erste Fassung und nicht einzeln abgenommen. Wer dort etwas ändert, ändert also keine
    fachliche Entscheidung, sondern eine Schätzung – anders als bei `valenz`, `subjBelebt`
    und `belebt`. Die Prüfseite dafür baut `bau-objektseite.js`.
  - **Der Dativ braucht kein Feld je Verb.** Ein lateinisches Dativobjekt ist fast immer
    eine Person (*alicuī*). Von 30 Dativverben sind es drei nicht – *studēre, interesse,
    prōvidēre* –, und die tragen `datArt`. Bei den **12 `dat+akk`-Verben greifen beide
    Regeln ineinander** und ergeben genau das Muster, das sie alle teilen: jemandem
    (Person) etwas (Sache). Das war keine Annahme – alle zwölf wurden nachgesehen.
  - **Gemessen**: Vorher verstiessen **113 von 405 Objekten (28 %)** gegen die Erwartung
    ihres Verbs, nachher 0 von 2113 über fünf Lektionsspannen. Von Hand durchgesehen waren
    vorher 14 von 32 Sätzen klar unmöglich (*equī iūdicia alunt*, *aquās canis accūsāverat*,
    *captīvus mīlitēs discēbat*), nachher 6 von 22.
  - `test-objektseite.js` prüft das am Verhalten, mit **Gegenprobe** (den Verben wird die
    Erwartung weggenommen, dann MÜSSEN Verstösse auftreten) und mit zwei Proben, die sonst
    still schiefgehen: dass der **Rückfall** nicht der Normalfall ist (`nurSachen` gibt den
    vollen Topf zurück, wenn nichts übrig bleibt – in kleinen Lektionstöpfen sähe die Regel
    dann aus, als wirke sie), und dass noch Sätze **herauskommen** (400 von 400 bis L10).

- **Semantik Stufe 2b: die Sachfelder** – GEBAUT (Oktober 2026). Was 2a nicht fing, war jeder
  Fehler INNERHALB der Sachen: *bibit urbēs*, *cēnam legunt*, *hōrās regere*, *facinora obsidēre*.
  - **Sechs Felder an den 254 Sache-Nomen** (`feld`), dazu `objFeld` an 98 wählerischen Verben.
    Die übrigen 131 Akkusativverben vertragen jedes Feld und tragen nichts.

    | Feld | Zahl | was darunter fällt |
    |---|---|---|
    | `ding` | 40 | Gegenstände, Körperteile, Himmelskörper |
    | `ort` | 53 | Siedlungen, Bauwerke, Wege **und Naturräume** (*silva, flūmen, mōns*) |
    | `text` | 14 | was aus Wörtern besteht – *carmen, epistula, lēx, verbum, tabula* |
    | `zeit` | 9 | *hōra, diēs, nox, annus* |
    | `stoff` | 7 | **nur Essbares und Trinkbares** |
    | `abstrakt` | 131 | alles Übrige |

  - **Die Felder sind danach geschnitten, was ein Verb mit der Sache anfangen kann –
    nicht nach Themen.** Deshalb stehen Naturräume unter `ort` (man betritt einen Wald wie
    eine Stadt) statt in einem eigenen Feld `natur`, das für kein Verb etwas vorhersagte.
  - **`stoff` ist bewusst eng.** Nur Essbares und Trinkbares – *aurum*, *ignis*, *cinis*
    stehen unter `ding`. Wäre `stoff` „alles Materielle", sähe *bibere* wieder fast jede
    Sache, und genau dafür gibt es das Feld. Es ist das einzige Verb, das `stoff` wirklich
    braucht; *intermittere* ist das einzige mit `zeit`.
  - **Lebewesen tragen kein Feld.** Ob eine Person als Objekt taugt, sagt `objArt` allein –
    ein Feld an ihnen wäre eine zweite Antwort auf dieselbe Frage. `objFeld` filtert deshalb
    nur unter den Sachen: *mittere* trägt `[ding, text, abstrakt]` und schickt trotzdem
    weiter Boten.
  - **DIE ENTSCHEIDUNG, AN DER ES HÄNGT: beim Feld gibt es KEINEN Rückfall.** `nurBelebte`
    und `nurSachen` geben den vollen Topf zurück, wenn nichts übrig bleibt („lieber ein
    schiefer Satz als gar keiner"). Beim Feld wäre das genau der Fehler, den es verhindern
    soll: Steht in der Lektionsauswahl nichts Trinkbares, lieferte der Rückfall wieder
    *urbēs bibere*. Stattdessen gibt `baueObjekt` `null`, und **`build()` nimmt in seiner
    Schleife über 20 Versuche einfach ein anderes Verb**. Das kostet nichts: In allen sechs
    geprüften Lektionsspannen entstehen weiterhin ~400 von 400 Sätzen.
    Das ist keine Kleinigkeit – *bibere* hat im GANZEN Wortschatz sieben mögliche Objekte,
    in einer kleinen Lektionsauswahl null. Ein leerer Feldtopf ist der Normalfall, nicht die
    Ausnahme. `test-sachfeld.js` prüft genau das an *bibere* mit einem Topf ohne Trinkbares.
  - **Gemessen**: Vorher lagen **65 von 330 Objekten (20 %)** im falschen Feld, nachher 0 von
    1800 über fünf Lektionsspannen – und das ZUSÄTZLICH zu den 28 %, die 2a abgefangen hat.
    Von Hand durchgesehen: vor 2a 14 von 32 Sätzen klar unmöglich, nach 2a 6 von 22, nach 2b
    7 von 36.
  - **Was jetzt noch falsch ist, ist LEXIKALISCH, nicht strukturell**: *incipere perīculum*
    („die Gefahr beginnen"), *solvere bellum*, *dōnāre vulnus*. Alle drei passen ins Feld –
    *incipere* will eine Tätigkeit, nicht irgendein Abstraktum. Das abzufangen hiesse, Felder
    in Unterfelder zu teilen, und dort hört der Ertrag auf: Jede weitere Stufe kostet mehr
    Einstufungsarbeit und fängt weniger. **Hier ist ein guter Punkt zum Aufhören.**
  - Die Einstufungen liegen als `latein-tests/sachfeld.json` (Nomen) und `objektfeld.json`
    (Verben); `einbau-sachfeld.js` schreibt sie nach `vocabulary.js`. Dort korrigieren, nicht
    im Wortschatz.
  - **Wie weit gegengelesen: GAR NICHT.** Anders als bei 2a, wo die 22 strittigen Einträge
    bestätigt sind, sind diese 254 Nomen- und 98 Verbeinstufungen durchweg meine erste
    Fassung. Wer hier etwas ändert, ändert eine Schätzung, keine fachliche Entscheidung.
    Die Prüfseite dafür baut `bau-objektseite.js` (drei Reiter: Objektart, Sachfeld der
    Nomen, Felder der Verben).

- Satzwertige Konstruktionen: Der **AcI** ist in `Arcus.html` umgesetzt. Offen sind
  **Participium coniunctum** (PPP ab L18, PPA ab L20) und **Ablativus absolutus** (ab L22) –
  gedacht als weitere Modi desselben Spiels, mit einem gemischten Modus als eigentlichem Ziel:
  Der Unterschied zwischen PC und Abl. abs. ist genau die Frage, ob das Bezugswort des Partizips
  im Hauptsatz steht, also ob `head` dorthin zeigt oder nicht.
  Dafür fehlt in `verbEngine.js` noch eine PPP-Deklination (das us/a/um-Muster gibt es bereits
  in `getGerundivumDeclension` und ließe sich nachnutzen).
- Achievement-Kategorie-Tracking (`recordCategoryAttempt`) ruft inzwischen jedes Spiel auf, das
  eine sinnvolle Kategorie hat – seit September 2026 auch IssaJump. Ohne bleibt nur Quiz.html
  (Kulturwissen, kein Wortschatz).

- **Jede Trophäe sagt selbst, wohin sie gehört** (`bereich`: `allgemein` / `bestleistung` /
  `kategorie`). `Achievements.html` hatte die Zuordnung als feste Liste von vier Kennungen, und
  alles, was nicht darin stand, galt als Wortart – die neue Höhen-Trophäe erschien dadurch
  zwischen den Substantiven und Verben. Zwei Listen mit denselben Kennungen driften
  auseinander; jetzt steht die Zuordnung an der Definition.

## Arbeitsweise, die sich bewährt hat

- Vor größeren Änderungen kurz den Plan/Ansatz erklären, dann erst umsetzen.
- Nach jeder Code-Änderung: Syntax prüfen, dann mit jsdom funktional testen, bevor etwas als
  "fertig" gemeldet wird.
- Bei Unklarheiten über Lehrplan-Reihenfolge oder didaktische Gewichtung lieber nachfragen als
  eine Annahme zu treffen – der Nutzer ist Fachlehrer und hat klare Vorstellungen dazu.
