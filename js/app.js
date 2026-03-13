/* ========================================
   Ick Factor Test - Tinder-Style Swipe Cards
   20 behavior cards, swipe right = ick, left = fine
   Touch/mouse drag + button/keyboard fallback
   ======================================== */

(function() {
    'use strict';

    // --- i18n helpers (try-catch) ---
    function getI18n() {
        try {
            if (typeof i18n !== 'undefined' && i18n) return i18n;
        } catch (e) { /* ignore */ }
        return null;
    }

    function t(key, fallback) {
        try {
            var inst = getI18n();
            if (inst && typeof inst.t === 'function') {
                var val = inst.t(key);
                if (val && val !== key) return val;
            }
        } catch (e) { /* ignore */ }
        return fallback || key;
    }

    function fmt(template, values) {
        var result = template;
        for (var k in values) {
            if (values.hasOwnProperty(k)) {
                result = result.replace(new RegExp('\\{' + k + '\\}', 'g'), values[k]);
            }
        }
        return result;
    }

    function $(id) { return document.getElementById(id); }

    // --- Check reduced motion preference ---
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Card data: 20 behaviors in 4 categories ---
    // category: hygiene(0-4), social(5-9), personality(10-14), dating(15-19)
    var cards = [
        { key: 'c1',  emoji: '\uD83D\uDE2C', cat: 'hygiene' },
        { key: 'c2',  emoji: '\uD83E\uDDA0', cat: 'hygiene' },
        { key: 'c3',  emoji: '\uD83D\uDC55', cat: 'hygiene' },
        { key: 'c4',  emoji: '\uD83C\uDF7D\uFE0F', cat: 'hygiene' },
        { key: 'c5',  emoji: '\uD83D\uDC85', cat: 'hygiene' },
        { key: 'c6',  emoji: '\uD83D\uDCF1', cat: 'social' },
        { key: 'c7',  emoji: '\uD83D\uDC94', cat: 'social' },
        { key: 'c8',  emoji: '\uD83D\uDCF8', cat: 'social' },
        { key: 'c9',  emoji: '\uD83D\uDE02', cat: 'social' },
        { key: 'c10', emoji: '\uD83D\uDC40', cat: 'social' },
        { key: 'c11', emoji: '\uD83D\uDE12', cat: 'personality' },
        { key: 'c12', emoji: '\uD83C\uDFC6', cat: 'personality' },
        { key: 'c13', emoji: '\uD83D\uDC76', cat: 'personality' },
        { key: 'c14', emoji: '\u2648',        cat: 'personality' },
        { key: 'c15', emoji: '\uD83E\uDD0F', cat: 'personality' },
        { key: 'c16', emoji: '\uD83D\uDCF1', cat: 'dating' },
        { key: 'c17', emoji: '\uD83C\uDF7D\uFE0F', cat: 'dating' },
        { key: 'c18', emoji: '\uD83C\uDF99\uFE0F', cat: 'dating' },
        { key: 'c19', emoji: '\uD83D\uDE02', cat: 'dating' },
        { key: 'c20', emoji: '\uD83D\uDEB6', cat: 'dating' }
    ];

    // --- Tier definitions ---
    var tiers = [
        { key: 'unbothered', emoji: '\uD83D\uDE0E', min: 0,  max: 4  },
        { key: 'chill',      emoji: '\uD83D\uDE42', min: 5,  max: 8  },
        { key: 'detector',   emoji: '\uD83D\uDD0D', min: 9,  max: 12 },
        { key: 'magnet',     emoji: '\uD83D\uDE2C', min: 13, max: 16 },
        { key: 'overlord',   emoji: '\uD83E\uDD22', min: 17, max: 20 }
    ];

    // Category keys for i18n
    var catKeys = ['hygiene', 'social', 'personality', 'dating'];

    // --- State ---
    var currentIndex = 0;
    var ickChoices = []; // true = ick, false = fine
    var isAnimating = false;

    // --- DOM elements ---
    var startScreen = $('startScreen');
    var swipeScreen = $('swipeScreen');
    var resultScreen = $('resultScreen');
    var startBtn = $('startBtn');
    var progressFill = $('progressFill');
    var progressText = $('progressText');
    var swipeArea = $('swipeArea');
    var currentCard = $('currentCard');
    var nextCard = $('nextCard');
    var overlayIck = $('overlayIck');
    var overlayFine = $('overlayFine');
    var cardCategory = $('cardCategory');
    var cardEmoji = $('cardEmoji');
    var cardText = $('cardText');
    var cardNumber = $('cardNumber');
    var btnFine = $('btnFine');
    var btnIck = $('btnIck');
    var swipeHint = $('swipeHint');
    var resultEmoji = $('resultEmoji');
    var resultCount = $('resultCount');
    var resultTitle = $('resultTitle');
    var resultDesc = $('resultDesc');
    var categoryBars = $('categoryBars');
    var ickItems = $('ickItems');
    var retakeBtn = $('retakeBtn');
    var shareTwitterBtn = $('shareTwitter');
    var shareCopyBtn = $('shareCopy');
    var themeToggle = $('themeToggle');
    var themeIcon = $('themeIcon');
    var langBtn = $('langBtn');
    var langDropdown = $('langDropdown');
    var currentLangLabel = $('currentLang');

    // --- Language name map ---
    var langNames = {
        ko: '\uD55C\uAD6D\uC5B4', en: 'English', zh: '\u4E2D\u6587',
        hi: '\u0939\u093F\u0928\u094D\u0926\u0940', ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
        ja: '\u65E5\u672C\u8A9E', es: 'Espa\u00F1ol', pt: 'Portugu\u00EAs',
        id: 'Indonesia', tr: 'T\u00FCrk\u00E7e', de: 'Deutsch', fr: 'Fran\u00E7ais'
    };

    // --- Swipe state ---
    var startX = 0;
    var startY = 0;
    var currentX = 0;
    var isDragging = false;
    var SWIPE_THRESHOLD = 100;

    // --- Screen management ---
    function showScreen(screen) {
        startScreen.style.display = 'none';
        swipeScreen.style.display = 'none';
        resultScreen.style.display = 'none';
        screen.style.display = '';
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }

    // --- Theme toggle ---
    function initTheme() {
        var saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        }
        updateThemeIcon();
    }

    function updateThemeIcon() {
        var current = document.documentElement.getAttribute('data-theme');
        if (themeIcon) {
            themeIcon.textContent = current === 'light' ? '\uD83C\uDF19' : '\u2600\uFE0F';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            var current = document.documentElement.getAttribute('data-theme');
            var next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            updateThemeIcon();
        });
    }

    // --- Language selector ---
    function initLangSelector() {
        if (!langBtn || !langDropdown) return;

        langBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            langDropdown.classList.toggle('active');
        });

        document.addEventListener('click', function(e) {
            if (!langDropdown.contains(e.target) && e.target !== langBtn) {
                langDropdown.classList.remove('active');
            }
        });

        var langOptions = langDropdown.querySelectorAll('.lang-option');
        langOptions.forEach(function(option) {
            option.addEventListener('click', function() {
                var lang = this.getAttribute('data-lang');
                langDropdown.classList.remove('active');

                var inst = getI18n();
                if (inst && typeof inst.setLanguage === 'function') {
                    inst.setLanguage(lang).then(function() {
                        if (currentLangLabel) {
                            currentLangLabel.textContent = langNames[lang] || lang;
                        }
                        refreshCurrentView();
                    }).catch(function() {});
                }
            });
        });

        var inst = getI18n();
        if (inst && currentLangLabel) {
            currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
        }
    }

    // --- Refresh current view after language change ---
    function refreshCurrentView() {
        if (swipeScreen.style.display !== 'none') {
            renderCard(currentIndex);
            renderNextCard(currentIndex + 1);
            // Re-render overlays
            if (overlayIck) overlayIck.textContent = t('swipe.ick', 'ICK!');
            if (overlayFine) overlayFine.textContent = t('swipe.fine', 'FINE');
        } else if (resultScreen.style.display !== 'none') {
            renderResult();
        }
    }

    // --- Get tier from ick count ---
    function getTier(count) {
        for (var i = tiers.length - 1; i >= 0; i--) {
            if (count >= tiers[i].min) return tiers[i];
        }
        return tiers[0];
    }

    // --- Category count helper ---
    function getCategoryCounts() {
        var counts = { hygiene: 0, social: 0, personality: 0, dating: 0 };
        for (var i = 0; i < ickChoices.length; i++) {
            if (ickChoices[i]) {
                counts[cards[i].cat]++;
            }
        }
        return counts;
    }

    // --- Render a card ---
    function renderCard(index) {
        if (index >= cards.length) return;
        var c = cards[index];

        // Category label
        if (cardCategory) {
            cardCategory.textContent = t('categories.' + c.cat, c.cat);
            cardCategory.className = 'card-category cat-' + c.cat;
        }

        // Emoji
        if (cardEmoji) {
            cardEmoji.textContent = c.emoji;
        }

        // Card text from i18n
        if (cardText) {
            cardText.textContent = t('cards.' + c.key, 'Card ' + (index + 1));
        }

        // Card number
        if (cardNumber) {
            cardNumber.textContent = (index + 1) + ' / ' + cards.length;
        }

        // Reset card position
        if (currentCard) {
            currentCard.style.transform = '';
            currentCard.classList.remove('animate-out', 'swipe-left', 'swipe-right', 'swiping');
        }

        // Reset overlays
        if (overlayIck) overlayIck.style.opacity = '0';
        if (overlayFine) overlayFine.style.opacity = '0';
    }

    // --- Render next card preview ---
    function renderNextCard(index) {
        if (!nextCard) return;
        if (index >= cards.length) {
            nextCard.style.display = 'none';
            return;
        }
        nextCard.style.display = '';
        var c = cards[index];
        nextCard.innerHTML = '<div class="card-emoji">' + c.emoji + '</div>' +
            '<p class="card-text">' + t('cards.' + c.key, 'Card ' + (index + 1)) + '</p>';
        nextCard.classList.remove('promote');
        nextCard.style.transform = 'scale(0.95) translateY(10px)';
        nextCard.style.opacity = '0.6';
    }

    // --- Update progress ---
    function updateProgress() {
        var pct = (currentIndex / cards.length) * 100;
        if (progressFill) progressFill.style.width = pct + '%';
        if (progressText) progressText.textContent = (currentIndex + 1) + ' / ' + cards.length;
    }

    // --- Start quiz ---
    function startQuiz() {
        currentIndex = 0;
        ickChoices = [];
        isAnimating = false;
        showScreen(swipeScreen);
        renderCard(0);
        renderNextCard(1);
        updateProgress();

        if (typeof gtag === 'function') {
            gtag('event', 'quiz_start', { event_category: 'ick-factor' });
        }
    }

    // --- Handle swipe decision ---
    function handleDecision(isIck) {
        if (isAnimating || currentIndex >= cards.length) return;
        isAnimating = true;

        ickChoices.push(isIck);

        // Animate card out
        var direction = isIck ? 'swipe-right' : 'swipe-left';

        if (prefersReducedMotion) {
            // No animation, just proceed
            advanceCard();
        } else {
            currentCard.classList.add('animate-out', direction);

            // Flash overlay
            if (isIck && overlayIck) {
                overlayIck.style.opacity = '1';
            } else if (!isIck && overlayFine) {
                overlayFine.style.opacity = '1';
            }

            // Promote next card
            if (nextCard && currentIndex + 1 < cards.length) {
                nextCard.classList.add('promote');
                nextCard.style.transform = 'scale(1) translateY(0)';
                nextCard.style.opacity = '1';
            }

            setTimeout(function() {
                advanceCard();
            }, 400);
        }
    }

    // --- Advance to next card or result ---
    function advanceCard() {
        currentIndex++;

        if (currentIndex >= cards.length) {
            // Show result
            if (progressFill) progressFill.style.width = '100%';
            showScreen(resultScreen);
            renderResult();
            isAnimating = false;
            return;
        }

        renderCard(currentIndex);
        renderNextCard(currentIndex + 1);
        updateProgress();
        isAnimating = false;
    }

    // --- Touch/Mouse drag handling ---
    function onDragStart(x, y) {
        if (isAnimating) return;
        isDragging = true;
        startX = x;
        startY = y;
        currentX = 0;
        if (currentCard) {
            currentCard.classList.add('swiping');
        }
    }

    function onDragMove(x, y) {
        if (!isDragging || isAnimating) return;
        var deltaX = x - startX;
        var deltaY = y - startY;
        currentX = deltaX;

        // If more vertical than horizontal, don't handle
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && Math.abs(deltaX) < 30) {
            return;
        }

        // Calculate rotation based on drag distance (max ~15deg)
        var rotation = deltaX * 0.08;
        rotation = Math.max(-15, Math.min(15, rotation));

        // Apply transform
        if (currentCard) {
            currentCard.style.transform = 'translateX(' + deltaX + 'px) rotate(' + rotation + 'deg)';
        }

        // Show overlays based on direction
        var progress = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1);
        if (deltaX > 0) {
            // Swiping right = ICK
            if (overlayIck) overlayIck.style.opacity = progress.toString();
            if (overlayFine) overlayFine.style.opacity = '0';
        } else {
            // Swiping left = FINE
            if (overlayFine) overlayFine.style.opacity = progress.toString();
            if (overlayIck) overlayIck.style.opacity = '0';
        }
    }

    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;

        if (currentCard) {
            currentCard.classList.remove('swiping');
        }

        if (Math.abs(currentX) >= SWIPE_THRESHOLD) {
            // Commit the swipe
            handleDecision(currentX > 0); // right = ick
        } else {
            // Snap back
            if (currentCard) {
                currentCard.style.transform = '';
            }
            if (overlayIck) overlayIck.style.opacity = '0';
            if (overlayFine) overlayFine.style.opacity = '0';
        }

        currentX = 0;
    }

    // --- Bind touch events ---
    function bindSwipeEvents() {
        if (!currentCard) return;

        // Touch events
        currentCard.addEventListener('touchstart', function(e) {
            var touch = e.touches[0];
            onDragStart(touch.clientX, touch.clientY);
        }, { passive: true });

        currentCard.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            var touch = e.touches[0];
            var deltaX = touch.clientX - startX;
            // Prevent vertical scroll while swiping horizontally
            if (Math.abs(deltaX) > 10) {
                e.preventDefault();
            }
            onDragMove(touch.clientX, touch.clientY);
        }, { passive: false });

        currentCard.addEventListener('touchend', function() {
            onDragEnd();
        }, { passive: true });

        currentCard.addEventListener('touchcancel', function() {
            onDragEnd();
        }, { passive: true });

        // Mouse events
        currentCard.addEventListener('mousedown', function(e) {
            e.preventDefault();
            onDragStart(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                onDragMove(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', function() {
            if (isDragging) {
                onDragEnd();
            }
        });
    }

    // --- Keyboard events ---
    function bindKeyboard() {
        document.addEventListener('keydown', function(e) {
            if (swipeScreen.style.display === 'none') return;
            if (isAnimating) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handleDecision(false); // Fine
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleDecision(true); // Ick
            }
        });
    }

    // --- Render result ---
    function renderResult() {
        var totalIcks = 0;
        for (var i = 0; i < ickChoices.length; i++) {
            if (ickChoices[i]) totalIcks++;
        }

        var tier = getTier(totalIcks);

        // Emoji
        if (resultEmoji) resultEmoji.textContent = tier.emoji;

        // Count
        if (resultCount) {
            resultCount.textContent = totalIcks + '/20 ' + t('result.icks', 'Icks!');
        }

        // Tier name and description
        if (resultTitle) {
            resultTitle.textContent = t('tiers.' + tier.key + '.name', tier.key);
        }
        if (resultDesc) {
            resultDesc.textContent = t('tiers.' + tier.key + '.desc', '');
        }

        // Percentile stat
        var percentile = Math.floor(Math.random() * 15) + 3;
        var percentileEl = $('percentileStat');
        if (percentileEl) {
            var pText = t('result.percentileStat', 'Only <strong>{percent}%</strong> of participants share your ick sensitivity level');
            percentileEl.innerHTML = pText.replace('{percent}', percentile);
        }

        // Category breakdown bars
        renderCategoryBars();

        // Ick list
        renderIckList();

        // GA4
        if (typeof gtag === 'function') {
            gtag('event', 'quiz_complete', {
                event_category: 'ick-factor',
                event_label: tier.key,
                value: totalIcks
            });
        }
    }

    // --- Render category bars ---
    function renderCategoryBars() {
        if (!categoryBars) return;
        categoryBars.innerHTML = '';

        var counts = getCategoryCounts();

        catKeys.forEach(function(cat) {
            var count = counts[cat];
            var total = 5; // 5 cards per category
            var pct = (count / total) * 100;

            var row = document.createElement('div');
            row.className = 'cat-bar-row';

            var label = document.createElement('span');
            label.className = 'cat-bar-label';
            label.textContent = t('categories.' + cat, cat);

            var track = document.createElement('div');
            track.className = 'cat-bar-track';

            var fill = document.createElement('div');
            fill.className = 'cat-bar-fill cat-' + cat;

            var countSpan = document.createElement('span');
            countSpan.className = 'cat-bar-count';
            countSpan.textContent = count + '/5';

            fill.appendChild(countSpan);
            track.appendChild(fill);
            row.appendChild(label);
            row.appendChild(track);
            categoryBars.appendChild(row);

            // Animate width after a brief delay
            setTimeout(function() {
                fill.style.width = Math.max(pct, count > 0 ? 20 : 0) + '%';
            }, 200);
        });
    }

    // --- Render ick list ---
    function renderIckList() {
        if (!ickItems) return;
        ickItems.innerHTML = '';

        var hasIcks = false;
        for (var i = 0; i < ickChoices.length; i++) {
            if (ickChoices[i]) {
                hasIcks = true;
                var tag = document.createElement('span');
                tag.className = 'ick-tag';
                tag.textContent = cards[i].emoji + ' ' + t('cards.' + cards[i].key, 'Card ' + (i + 1));
                ickItems.appendChild(tag);
            }
        }

        if (!hasIcks) {
            var noIcks = document.createElement('p');
            noIcks.className = 'no-icks';
            noIcks.textContent = t('result.noIcks', 'Nothing gives you the ick!');
            ickItems.appendChild(noIcks);
        }
    }

    // --- Share: Twitter ---
    function shareTwitter() {
        var totalIcks = 0;
        for (var i = 0; i < ickChoices.length; i++) {
            if (ickChoices[i]) totalIcks++;
        }
        var tier = getTier(totalIcks);
        var tierLabel = t('tiers.' + tier.key + '.name', tier.key);
        var text = fmt(t('share.text', 'I got {count}/20 icks! My ick sensitivity: "{tier}"'), {
            count: totalIcks,
            tier: tierLabel
        });
        var url = 'https://dopabrain.com/ick-factor/';
        window.open(
            'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url),
            '_blank',
            'noopener'
        );
        if (typeof gtag === 'function') {
            gtag('event', 'share', { method: 'twitter', content_type: 'quiz_result' });
        }
    }

    // --- Share: Copy URL ---
    function copyUrl() {
        var url = 'https://dopabrain.com/ick-factor/';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                showCopiedFeedback();
            }).catch(function() {
                fallbackCopy(url);
            });
        } else {
            fallbackCopy(url);
        }
        if (typeof gtag === 'function') {
            gtag('event', 'share', { method: 'copy', content_type: 'quiz_result' });
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopiedFeedback(); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
    }

    function showCopiedFeedback() {
        if (!shareCopyBtn) return;
        var original = shareCopyBtn.textContent;
        shareCopyBtn.textContent = t('share.copied', 'Copied!');
        setTimeout(function() {
            shareCopyBtn.textContent = t('share.copyUrl', 'Copy Link');
        }, 2000);
    }

    // --- Hide loader ---
    function hideLoader() {
        var loader = $('app-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    // --- Bind all events ---
    function bindEvents() {
        if (startBtn) {
            startBtn.addEventListener('click', startQuiz);
        }

        if (btnFine) {
            btnFine.addEventListener('click', function() {
                handleDecision(false);
            });
        }

        if (btnIck) {
            btnIck.addEventListener('click', function() {
                handleDecision(true);
            });
        }

        if (retakeBtn) {
            retakeBtn.addEventListener('click', function() {
                showScreen(startScreen);
            });
        }

        if (shareTwitterBtn) {
            shareTwitterBtn.addEventListener('click', shareTwitter);
        }

        if (shareCopyBtn) {
            shareCopyBtn.addEventListener('click', copyUrl);
        }

        bindSwipeEvents();
        bindKeyboard();
    }

    // --- Init ---
    function init() {
        initTheme();
        initLangSelector();
        bindEvents();

        var inst = getI18n();
        if (inst && typeof inst.loadTranslations === 'function') {
            inst.loadTranslations(inst.currentLang).then(function() {
                if (typeof inst.updateUI === 'function') {
                    inst.updateUI();
                }
                if (currentLangLabel) {
                    currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
                }
                hideLoader();
            }).catch(function() {
                hideLoader();
            });
        } else {
            hideLoader();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
