// Daten-Pool für das römische Alltags-Quiz
// Basierend auf den Sachinfos des Lehrbuchs

const quizQuestions = [
    {
        category: "Wohnen im alten Rom",
        question: "Warum hieß der Hauptraum im römischen Einfamilienhaus eigentlich „Atrium“?",
        correct: "Weil die Wände dort früher oft vom Rauch des Herdes schwarz (ater) gefärbt waren.",
        wrong: [
            "Weil der Raum ohne Dach war und man direkt in die Sterne (astra) schauen konnte.",
            "Weil es der absolut wichtigste Raum war und immer in der Mitte (Zentrum) lag.",
            "Weil dort die kostbaren Atrium-Statuen der Götter standen."
        ]
    },
    {
        category: "Wohnen im alten Rom",
        question: "Wie aßen vornehme, reiche Römer in ihrem Speisesaal (Triclinium)?",
        correct: "Sie lagen gemütlich auf speziellen Speisesofas.",
        wrong: [
            "Sie saßen auf hohen Holzstühlen an einem langen Tisch.",
            "Sie standen meistens an kleinen Stehtischen, um Zeit zu sparen.",
            "Sie saßen im Schneidersitz auf weichen Teppichen auf dem Boden."
        ]
    },
    {
        category: "Wohnen im alten Rom",
        question: "Wo lebte die absolut größte Masse der römischen Bevölkerung?",
        correct: "In großen, oft dunklen Mietshäusern (insulae), die bis zu sieben Stockwerke hoch waren.",
        wrong: [
            "In kleinen, gemütlichen Einfamilienhäusern mit einem eigenen Säulengarten.",
            "In riesigen Prachtpalästen, die rund um die Hügel Roms gebaut waren.",
            "In Zelten und einfachen Holzhütten außerhalb der großen Stadtmauer."
        ]
    },
    {
        category: "Die Hausgemeinschaft",
        question: "Wer gehörte im antiken Rom alles zur „familia“?",
        correct: "Die ganze Hausgemeinschaft: Eltern, Kinder und auch alle Sklaven des Haushalts.",
        wrong: [
            "Nur die Blutsverwandten, also Vater, Mutter, Kinder und die Großeltern.",
            "Alle freien Bürger, die in derselben Straße wohnten.",
            "Nur der Vater und seine Söhne, da Frauen nicht zur familia zählten."
        ]
    },
    {
        category: "Die Hausgemeinschaft",
        question: "Wie wurden Sklavinnen und Sklaven von den Römern vor dem Gesetz (juristisch) betrachtet?",
        correct: "Als eine „Sache“ (res), die man einfach verkaufen, verleihen und vererben konnte.",
        wrong: [
            "Als fest angestellte Arbeiter mit einem strengen Arbeitsvertrag.",
            "Als Bürger zweiter Klasse, die zwar kein Geld hatten, aber wählen durften.",
            "Als unfreiwillige Gäste, die nach einem Jahr wieder gehen durften."
        ]
    },
    {
        category: "Leben auf dem Land",
        question: "Was war für die Menschen im alten Rom die einzige Möglichkeit, ihr Essen zu süßen?",
        correct: "Honig von den Bienen.",
        wrong: [
            "Feiner Rohrzucker aus fernen Ländern.",
            "Süßer, eingekochter Sirup aus Oliven.",
            "Zuckerrüben, die auf den Feldern wuchsen."
        ]
    },
    {
        category: "Schule im alten Rom",
        question: "Auf welchem Material haben Kinder in der römischen Elementarschule am häufigsten geschrieben?",
        correct: "Auf Tafeln aus Holz, die mit einer weichen Wachsschicht überzogen waren.",
        wrong: [
            "Auf teurem, glattem Papier (Papyrus) aus Ägypten.",
            "Auf kleinen Schiefertafeln mit Kreide.",
            "Sie ritzten die Buchstaben mit Stöcken in kleine Sandkästen."
        ]
    },
    {
        category: "Schule im alten Rom",
        question: "Wie sah der Unterricht beim „magister“ für die jungen Kinder meistens aus?",
        correct: "Alle Schüler sprachen die Sätze laut im Chor nach und mussten vieles auswendig lernen.",
        wrong: [
            "Jeder Schüler arbeitete ganz still für sich alleine an seinen Arbeitsblättern.",
            "Die Kinder machten spannende Projektarbeiten in kleinen Gruppen.",
            "Der Lehrer sang Lieder, und die Kinder durften dazu durch den Raum tanzen."
        ]
    },
    {
        category: "Das Forum Romanum",
        question: "Auf dem Forum gab es die „Rostra“. Was war das für ein besonderer Ort?",
        correct: "Eine große Rednertribüne, die mit erbeuteten Schiffsschnäbeln verziert war.",
        wrong: [
            "Ein spezieller Marktstand, an dem frischer Fisch und Meeresfrüchte verkauft wurden.",
            "Das dunkelste Gefängnis des gesamten römischen Reiches.",
            "Ein heiliger Tempel, der dem Meeresgott Neptun geweiht war."
        ]
    },
    {
        category: "Das Forum Romanum",
        question: "Wer hütete das heilige „Staatsfeuer“ im Tempel der Vesta, das niemals ausgehen durfte?",
        correct: "Die Vestalinnen, die einzige rein weibliche Priesterschaft in ganz Rom.",
        wrong: [
            "Der „pontifex maximus“ (der oberste Priester) höchstpersönlich.",
            "Spezielle römische Feuersklaven, die Tag und Nacht Wache hielten.",
            "Die mächtigsten Senatoren Roms wechselten sich jede Nacht ab."
        ]
    },
    {
        category: "Wagenrennen",
        question: "Wie wussten die Zuschauer im riesigen Circus Maximus, wie viele Runden schon gefahren wurden?",
        correct: "Es gab große Eier und Delphine aus Marmor, die nach jeder Runde umgeklappt wurden.",
        wrong: [
            "Ein Ausrufer brüllte die Rundenzahl durch ein riesiges Bronzerohr.",
            "Für jede geschaffte Runde wurde ein neues Feuer auf der Mauer angezündet.",
            "Die Wagenlenker warfen nach jeder Runde einen kleinen Stein aus dem Wagen."
        ]
    },
    {
        category: "Wagenrennen",
        question: "Die Wagenlenker lebten sehr gefährlich. Warum hatten sie bei Rennen immer ein Messer dabei?",
        correct: "Weil sie die Zügel um den Bauch banden und sie bei einem Unfall schnell durchschneiden mussten.",
        wrong: [
            "Um gegnerische Fahrer in den Kurven abwehren oder angreifen zu können.",
            "Um im Notfall die Holzräder der anderen Wagen zu zerstören.",
            "Das Messer war ein Glücksbringer, der dem Kriegsgott Mars geweiht war."
        ]
    },
    {
        category: "Wohnen im alten Rom",
        question: "Was hing bei reichen römischen Familien oft im Hauptraum (Atrium) an der Wand?",
        correct: "Wachsmasken von berühmten und wichtigen Vorfahren.",
        wrong: [
            "Kleine Holztafeln mit den aktuellen Schulnoten der Kinder.",
            "Waffen von Feinden, die in großen Kriegen besiegt wurden.",
            "Bunte Teppiche, die den Raum vor der Kälte schützen sollten."
        ]
    },
    {
        category: "Wohnen im alten Rom",
        question: "Warum waren die Mieten für die dunklen Wohnungen (insulae) im Zentrum Roms so extrem hoch?",
        correct: "Weil alle im Zentrum leben wollten, da es noch keine Busse oder Bahnen für den Weg zur Arbeit gab.",
        wrong: [
            "Weil alle Wohnungen fließendes Wasser und eigene Toiletten hatten.",
            "Weil der Kaiser eine spezielle Steuer auf hohe Gebäude erhob.",
            "Weil die Römer besonders gerne Treppen stiegen und hoch wohnen wollten."
        ]
    },
    {
        category: "Wohnen im alten Rom",
        question: "Was befand sich in einem mehrstöckigen römischen Mietshaus (insula) meistens ganz unten im Erdgeschoss?",
        correct: "Dort lagen häufig Läden, Werkstätten und kleine Lokale.",
        wrong: [
            "Ein großer Pferdestall für alle Mieter des Hauses.",
            "Ein prächtiger Garten mit einem Springbrunnen.",
            "Die Büros der römischen Senatoren und Politiker."
        ]
    },
    {
        category: "Die Hausgemeinschaft",
        question: "Manche Sklaven trugen Halsbänder aus Metall. Welche Inschrift fand man auf einem solchen Band?",
        correct: "Ich bin geflohen. Halt mich fest!",
        wrong: [
            "Ich bin der beste Arbeiter Roms. Belohne mich!",
            "Eigentum des Kaisers Augustus. Nicht anfassen!",
            "Bitte nicht füttern. Ich arbeite für mein Essen."
        ]
    },
    {
        category: "Die Hausgemeinschaft",
        question: "Was verstand man im alten Rom unter der „patria potestas“?",
        correct: "Die „väterliche Gewalt“. Der Vater bestimmte über alle Personen im Haushalt, selbst über erwachsene Kinder.",
        wrong: [
            "Das „Vaterland“. Es beschrieb die Pflicht jedes Römers, für sein Land zu kämpfen.",
            "Den „Vatertag“. Ein Fest, bei dem der Hausherr nicht arbeiten musste.",
            "Das „Vatergeld“. Das Taschengeld, das Kinder für ihre Arbeit bekamen."
        ]
    },
    {
        category: "Leben auf dem Land",
        question: "Wer führte meistens den Betrieb auf einer „villa rustica“ (dem römischen Bauernhof)?",
        correct: "Ein Gutsverwalter (vilicus), der oft selbst ein Sklave war.",
        wrong: [
            "Der Besitzer selbst, der jeden Tag von morgens bis abends auf dem Feld stand.",
            "Ein römischer Soldat im Ruhestand, der das Land geschenkt bekam.",
            "Der älteste Sohn der Familie musste den Hof leiten."
        ]
    },
    {
        category: "Leben auf dem Land",
        question: "Wie nannte man in Rom die wirklich riesigen landwirtschaftlichen Großbetriebe?",
        correct: "Latifundien.",
        wrong: [
            "Insulae.",
            "Cubicula.",
            "Basilicae."
        ]
    },
    {
        category: "Schule im alten Rom",
        question: "Gab es im alten Rom eigentlich eine Schulpflicht wie bei uns heute?",
        correct: "Nein, Schule war Privatsache. Die Eltern mussten den Unterricht selbst bezahlen.",
        wrong: [
            "Ja, jedes Kind musste vom 6. bis zum 16. Lebensjahr zur Schule gehen.",
            "Nur Jungen mussten zur Schule gehen, Mädchen durften es sich aussuchen.",
            "Ja, der Kaiser bezahlte die Schulen und zwang alle Kinder hinzugehen."
        ]
    },
    {
        category: "Schule im alten Rom",
        question: "Wo fand der Unterricht der Elementarschule für Kinder aus nicht so reichen Familien oft statt?",
        correct: "In einfachen Bretterbuden oder in Ecken von öffentlichen Säulenhallen, oft inmitten von großem Lärm.",
        wrong: [
            "In riesigen, leisen Bibliotheken, in denen man nicht sprechen durfte.",
            "Im Forum Romanum, direkt auf den Stufen vor den großen Tempeln.",
            "Zuhause im Atrium, wo der Vater die Kinder selbst unterrichtete."
        ]
    },
    {
        category: "Schule im alten Rom",
        question: "Was war für junge Männer (ab 16 Jahren), die Politiker oder Anwalt werden wollten, das absolut wichtigste Schulfach?",
        correct: "Die Rhetorik (Redekunst).",
        wrong: [
            "Die Geometrie (Mathematik).",
            "Die Astrologie (Sternenkunde).",
            "Die Botanik (Pflanzenkunde)."
        ]
    },
    {
        category: "Das Forum Romanum",
        question: "Was war im antiken Rom sicher im tiefen Keller des „Tempels des Saturn“ eingelagert?",
        correct: "Der römische Staatsschatz.",
        wrong: [
            "Die wilden Tiere für die Wagenrennen.",
            "Hunderte Fässer voll mit frischem Wasser.",
            "Die geheimen Waffen der kaiserlichen Armee."
        ]
    },
    {
        category: "Das Forum Romanum",
        question: "Kaiser Augustus war einmal sehr empört über die Leute auf dem Forum Romanum. Welches Gesetz erließ er?",
        correct: "Die Toga-Pflicht. Wer keine feierliche Toga trug, durfte das Forum nicht mehr betreten.",
        wrong: [
            "Das Schweige-Gebot. Niemand durfte auf dem Forum lauter sprechen als er selbst.",
            "Die Helm-Pflicht. Wegen herunterfallender Ziegelsteine mussten alle Helme tragen.",
            "Das Pferde-Verbot. Wer auf dem Forum ritt, verlor sein Pferd."
        ]
    },
    {
        category: "Wagenrennen",
        question: "Wie begann ein Renntag im riesigen Circus Maximus?",
        correct: "Mit einer feierlichen, prächtigen Prozession (pompa), bei der sogar Götterbilder getragen wurden.",
        wrong: [
            "Mit einem Gladiatorenkampf, bei dem der Sieger den Startschuss geben durfte.",
            "Der Kaiser betrat schweigend die Arena und warf ein weißes Tuch auf den Sand.",
            "Alle 250.000 Zuschauer mussten gemeinsam ein Lied singen."
        ]
    },
    {
        category: "Wagenrennen",
        question: "Manche Zuschauer (Fans) griffen zu extremen Mitteln, damit ihre feindlichen Wagenlenker verloren. Was taten sie?",
        correct: "Sie vergruben kleine Bleitafeln (Fluchtafeln) im Sand, um die Gegner zu verfluchen.",
        wrong: [
            "Sie schossen mit kleinen Steinschleudern von der Tribüne auf die Pferde.",
            "Sie streuten heimlich Glasscherben auf die Rennstrecke der Arena.",
            "Sie mischten Schlafpulver in das Futter der feindlichen Pferde."
        ]
    };
