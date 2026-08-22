// achievementToast.js
// Kleine, wiederverwendbare Popup-Anzeige für frisch freigeschaltete Achievements.
// Einbinden per <script src="achievementToast.js"></script> NACH progress.js.
// Aufruf: AchievementToast.show(unlockArray) - unlockArray ist die Rückgabe von
// LudiProgress.recordVocabAttempt() bzw. .recordCategoryAttempt() (kann leer/null sein).

const AchievementToast = (() => {
    const BADGE_IMAGES = {
        1: 'assets/achievements/badge_bronze.png',
        2: 'assets/achievements/badge_silver.png',
        3: 'assets/achievements/badge_gold.png',
        4: 'assets/achievements/badge_diamond.png'
    };

    let queue = [];
    let showing = false;

    function _ensureStyles() {
        if (document.getElementById('achievement-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'achievement-toast-styles';
        style.textContent = `
            @keyframes achToastIn {
                0% { transform: translateX(-50%) translateY(-30px); opacity: 0; }
                100% { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes achToastOut {
                0% { transform: translateX(-50%) translateY(0); opacity: 1; }
                100% { transform: translateX(-50%) translateY(-30px); opacity: 0; }
            }
            .achievement-toast {
                position: fixed; top: 20px; left: 50%;
                z-index: 999999;
                background: linear-gradient(135deg, #2a2410, #1a1608);
                border: 2px solid #d4af37;
                border-radius: 14px;
                padding: 14px 22px 14px 14px;
                display: flex; align-items: center; gap: 14px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.3);
                font-family: 'Verdana', sans-serif;
                color: #f5f5f5;
                max-width: 90vw;
                animation: achToastIn 0.4s ease-out;
            }
            .achievement-toast.leaving { animation: achToastOut 0.35s ease-in forwards; }
            .achievement-toast img { width: 56px; height: 56px; flex-shrink: 0; }
            .achievement-toast .ach-toast-title {
                font-family: 'Georgia', serif; color: #d4af37; font-weight: bold;
                font-size: 0.95rem; margin-bottom: 2px;
            }
            .achievement-toast .ach-toast-desc { font-size: 0.85rem; color: #ddd; }
        `;
        document.head.appendChild(style);
    }

    function _showNext() {
        if (queue.length === 0) { showing = false; return; }
        showing = true;
        const unlock = queue.shift();

        const toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML = `
            <img src="${BADGE_IMAGES[unlock.tier]}" alt="${unlock.tierName}-Abzeichen">
            <div>
                <div class="ach-toast-title">${unlock.tierName} freigeschaltet: ${unlock.icon} ${unlock.title}</div>
                <div class="ach-toast-desc">${unlock.threshold} ${unlock.unit}</div>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('leaving');
            setTimeout(() => {
                toast.remove();
                _showNext();
            }, 350);
        }, 3200);
    }

    /**
     * Zeigt ein oder mehrere frisch freigeschaltete Achievements nacheinander an.
     * unlocks: einzelnes Achievement-Objekt, Array davon, oder null/undefined (dann passiert nichts).
     */
    function show(unlocks) {
        if (!unlocks) return;
        _ensureStyles();
        const list = Array.isArray(unlocks) ? unlocks : [unlocks];
        if (list.length === 0) return;
        queue.push(...list);
        if (!showing) _showNext();
    }

    return { show };
})();
