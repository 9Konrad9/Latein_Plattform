// lessonFilter.js
// Zeigt vor Spielstart einen Auswahlbildschirm, mit dem Lektionen ausgewählt werden können.
// Filtert daraufhin den übergebenen Vokabelpool und übergibt das Ergebnis per Callback.
// Einbinden NACH vocabulary.js, VOR dem jeweiligen Spiel-Script.

const LessonFilter = (() => {

    function getAvailableLessons(pool) {
        const lessons = [...new Set(pool.map(v => v.lesson))].filter(l => l !== undefined);
        return lessons.sort((a, b) => a - b);
    }

    function lessonLabel(l) {
        return l === 0 ? "Salvē" : "Lektion " + l;
    }

    /**
     * pool: der vollständige globalVocabularyPool
     * onConfirm(filteredPool): wird mit dem gefilterten Pool aufgerufen, sobald bestätigt wurde
     */
    function show(pool, onConfirm) {
        const lessons = getAvailableLessons(pool);

        const overlay = document.createElement('div');
        overlay.id = 'lesson-filter-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(10, 8, 6, 0.94);
            z-index: 99999; display: flex; align-items: center; justify-content: center;
            font-family: inherit; padding: 20px; box-sizing: border-box;
        `;

        const tilesHtml = lessons.map(l => `
            <button class="lf-tile" data-lesson="${l}" style="
                padding: 14px 8px; border-radius: 8px; border: 2px solid #d4af37;
                background: transparent; color: #d4af37; font-size: 1rem;
                cursor: pointer; font-weight: bold; transition: all 0.15s;
            ">${lessonLabel(l)}</button>
        `).join('');

        overlay.innerHTML = `
            <div style="background:#1a1410; border:2px solid #d4af37; border-radius:14px;
                        padding:30px; max-width:480px; width:100%; text-align:center;
                        box-shadow: 0 0 40px rgba(212,175,55,0.2);
                        max-height:90vh; overflow-y:auto; box-sizing:border-box;">
                <h2 style="color:#d4af37; margin-top:0; font-size:1.4rem;">Welche Lektionen möchtest du üben?</h2>

                <div style="display:flex; align-items:center; justify-content:center; gap:10px;
                            margin-bottom:20px; padding:14px; background:rgba(212,175,55,0.08);
                            border-radius:8px; border:1px solid rgba(212,175,55,0.3);">
                    <label for="lf-upto-input" style="color:#ccc; font-size:0.9rem;">Bis Lektion:</label>
                    <input type="number" id="lf-upto-input" min="${lessons[0]}" max="${lessons[lessons.length-1]}"
                           style="width:60px; padding:6px; border-radius:6px; border:1px solid #d4af37;
                                  background:#0d0a07; color:#d4af37; font-size:1rem; text-align:center;">
                    <button id="lf-upto-btn" style="padding:8px 16px; border-radius:6px; border:none;
                                background:#d4af37; color:#1a1410; font-weight:bold; cursor:pointer;
                                font-size:0.9rem;">Übernehmen</button>
                </div>

                <p style="color:#ccc; font-size:0.9rem; margin-bottom:12px;">... oder wähle einzelne Lektionen direkt aus:</p>
                <div id="lf-tiles" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(90px,1fr));
                            gap:10px; margin-bottom:20px;">
                    ${tilesHtml}
                </div>
                <button id="lf-all-btn" style="background:none; border:none; color:#aaa;
                            text-decoration:underline; cursor:pointer; font-size:0.9rem; margin-bottom:22px;">
                    Alle Lektionen auswählen (große Wiederholung)
                </button>
                <div>
                    <button id="lf-confirm-btn" disabled style="padding:13px 34px; border-radius:8px;
                                border:none; background:#555; color:#fff; font-size:1.1rem;
                                cursor:not-allowed; font-weight:bold;">Los geht's!</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const selected = new Set();
        const tiles = overlay.querySelectorAll('.lf-tile');
        const confirmBtn = overlay.querySelector('#lf-confirm-btn');

        function refreshConfirmButton() {
            const active = selected.size > 0;
            confirmBtn.disabled = !active;
            confirmBtn.style.background = active ? '#d4af37' : '#555';
            confirmBtn.style.color = active ? '#1a1410' : '#fff';
            confirmBtn.style.cursor = active ? 'pointer' : 'not-allowed';
        }

        function toggleTile(tile) {
            const lesson = tile.getAttribute('data-lesson');
            if (selected.has(lesson)) {
                selected.delete(lesson);
                tile.style.background = 'transparent';
                tile.style.color = '#d4af37';
            } else {
                selected.add(lesson);
                tile.style.background = '#d4af37';
                tile.style.color = '#1a1410';
            }
            refreshConfirmButton();
        }

        tiles.forEach(tile => tile.addEventListener('click', () => toggleTile(tile)));

        overlay.querySelector('#lf-all-btn').addEventListener('click', () => {
            tiles.forEach(tile => {
                const lesson = tile.getAttribute('data-lesson');
                if (!selected.has(lesson)) toggleTile(tile);
            });
        });

        overlay.querySelector('#lf-upto-btn').addEventListener('click', () => {
            const input = overlay.querySelector('#lf-upto-input');
            const maxLesson = parseInt(input.value, 10);
            if (isNaN(maxLesson)) return;
            tiles.forEach(tile => {
                const lesson = Number(tile.getAttribute('data-lesson'));
                const shouldBeSelected = lesson <= maxLesson;
                const isSelected = selected.has(tile.getAttribute('data-lesson'));
                if (shouldBeSelected !== isSelected) toggleTile(tile);
            });
        });

        confirmBtn.addEventListener('click', () => {
            if (selected.size === 0) return;
            const selectedNums = Array.from(selected).map(Number).sort((a, b) => a - b);
            const filtered = pool.filter(v => selectedNums.includes(v.lesson));
            document.body.removeChild(overlay);
            onConfirm(filtered, selectedNums);
        });
    }

    return { show };
})();
