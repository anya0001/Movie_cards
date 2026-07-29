(function () {
    "use strict";

    const deckLoading = document.getElementById("deckLoading");
    const deckEmpty = document.getElementById("deckEmpty");
    const cardA = document.getElementById("cardA");
    const cardB = document.getElementById("cardB");

    const btnPrev = document.getElementById("btnPrev");
    const btnSkip = document.getElementById("btnSkip");
    const btnLike = document.getElementById("btnLike");
    const btnRestart = document.getElementById("btnRestart");

    const { loadMovieIntoCard, setHeartState } = window.MovieCardTemplate;

    const trailerModal = document.getElementById("trailerModal");
    const trailerIframe = document.getElementById("trailerIframe");

    const slots = [cardA, cardB];
    let frontIdx = 0; // slots[frontIdx] is the interactive front card

    let order = [];
    let pointer = 0;
    let busy = false; // guards against double-triggers mid-animation
    let exitDirections = []; // exitDirections[i] = which side card i exited toward

    const SWIPE_THRESHOLD = 90; // px before a drag counts as a swipe
    const DOUBLE_TAP_WINDOW = 350; // ms
    const DOUBLE_TAP_RADIUS = 60; // px
    const DRAG_EXIT_MS = 320; // must match the transition duration used in finishDragExit

    function frontEl() {
        return slots[frontIdx];
    }

    function behindEl() {
        return slots[1 - frontIdx];
    }

    function clearInlineTransform(el) {
        el.style.transition = "";
        el.style.transform = "";
        el.style.opacity = "";
    }

    // Silently (no visible transition) drop an element into the "behind"
    // slot with new content — used to recycle a card right after it's
    // done exiting, so it's ready and waiting for the next transition.
    function prepareBehindSlot(el, movie) {
        if (!movie) {
            el.classList.add("is-hidden");
            return;
        }
        el.classList.remove("is-hidden");
        loadMovieIntoCard(el, movie);
        el.style.transition = "none";
        el.classList.remove("stack-front", "flying-skip", "flying-like", "flying-in-right", "flying-in-top", "entering");
        el.classList.add("stack-behind");
        el.style.transform = "";
        el.style.opacity = "";
        void el.offsetWidth; // force reflow so the "none" transition is committed
        el.style.transition = "";
    }

    function showCard() {
        deckLoading.classList.add("is-hidden");
        deckEmpty.classList.add("is-hidden");
    }

    function showEmpty() {
        cardA.classList.add("is-hidden");
        cardB.classList.add("is-hidden");
        deckEmpty.classList.remove("is-hidden");
    }

    function isExhausted() {
        return order.length === 0 || pointer >= order.length;
    }

    function updateControls() {
        btnPrev.disabled = pointer <= 0;
        btnSkip.disabled = isExhausted();
        btnLike.disabled = isExhausted();

        const movie = order[pointer];
        const liked = !!(movie && movie.liked);
        btnLike.classList.toggle("is-liked", liked);
        btnLike.title = liked ? "Remove from watchlist" : "Add to watchlist";
    }

    async function loadDeck() {
        deckLoading.classList.remove("is-hidden");
        cardA.classList.add("is-hidden");
        cardB.classList.add("is-hidden");
        deckEmpty.classList.add("is-hidden");

        try {
            const res = await fetch("/api/movies");
            order = await res.json();
        } catch (err) {
            order = [];
        }

        pointer = 0;
        exitDirections = [];
        updateControls();

        if (order.length === 0) {
            showEmpty();
            return;
        }

        frontIdx = 0;
        cardA.classList.remove("is-hidden", "stack-behind");
        cardA.classList.add("stack-front");
        loadMovieIntoCard(cardA, order[0]);
        clearInlineTransform(cardA);

        prepareBehindSlot(cardB, order[1]);

        showCard();
    }

    // ---- Exit / entrance animations -------------------------------------

    function runExitAnimation(el, className) {
        return new Promise((resolve) => {
            el.classList.add(className);
            el.addEventListener(
                "animationend",
                function handler() {
                    el.removeEventListener("animationend", handler);
                    el.classList.remove(className);
                    resolve();
                },
                { once: true }
            );
        });
    }

    function playEntranceAnimation(el, className) {
        return new Promise((resolve) => {
            el.classList.add(className);
            el.addEventListener(
                "animationend",
                function handler() {
                    el.removeEventListener("animationend", handler);
                    el.classList.remove(className);
                    resolve();
                },
                { once: true }
            );
        });
    }

    // Drag-triggered exit: continues smoothly from wherever the finger let go.
    // Resolved with a plain timer (not an event) so it can never get stuck.
    function finishDragExit(el, directionX, directionY = 0) {
        return new Promise((resolve) => {
            const distanceX = directionX ? window.innerWidth * 1.2 * directionX : 0;
            const distanceY = directionY ? window.innerHeight * 1.2 * directionY : 0;
            const rotate = directionX * 14;

            el.style.transition =
                `transform ${DRAG_EXIT_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${DRAG_EXIT_MS}ms ease`;

            requestAnimationFrame(() => {
                el.style.transform = `translateX(${distanceX}px) translateY(${distanceY}px) rotateZ(${rotate}deg)`;
                el.style.opacity = "0";
            });

            setTimeout(() => {
                clearInlineTransform(el);
                resolve();
            }, DRAG_EXIT_MS);
        });
    }

    // ---- Core navigation ---------------------------------------------------

    async function advance(exitAnimFn, direction) {
        if (busy || isExhausted()) return;
        busy = true;

        const outgoing = frontEl();
        const incoming = behindEl();

        // The behind card brightens and rises to the front at the same time
        // the front card is leaving — pure CSS transition, no JS timing needed.
        incoming.classList.remove("stack-behind");
        incoming.classList.add("stack-front");

        await exitAnimFn(outgoing);

        exitDirections[pointer] = direction;
        pointer += 1;
        frontIdx = 1 - frontIdx;

        if (pointer >= order.length) {
            showEmpty();
            updateControls();
            busy = false;
            return;
        }

        // Recycle the card that just left into the new "behind" slot,
        // preloaded with whatever comes after the new front card.
        prepareBehindSlot(outgoing, order[pointer + 1]);
        updateControls();
        busy = false;
    }

    // "Previous" never moves the currently-showing card off the deck — it
    // recedes to the behind position, while the dismissed card returns from
    // the same side it left toward.
    async function goPrev() {
        if (busy || pointer <= 0) return;
        busy = true;

        const receding = frontEl();
        const returning = behindEl();

        pointer -= 1;
        const direction = exitDirections[pointer];
        const movie = order[pointer];

        // Going back never unlikes the card anymore — a liked movie stays
        // liked (and its heart shows filled) until the person taps the
        // heart badge itself. The card still flies back in from the top
        // if that's the direction it left in.

        // Current front quietly recedes into the behind position.
        receding.classList.remove("stack-front");
        receding.classList.add("stack-behind");

        // Repurpose the behind card to bring the dismissed one back.
        loadMovieIntoCard(returning, movie);
        returning.classList.remove("is-hidden", "stack-behind");
        returning.classList.add("stack-front");
        clearInlineTransform(returning);

        deckEmpty.classList.add("is-hidden");
        cardA.classList.remove("is-hidden");
        cardB.classList.remove("is-hidden");

        const entranceClass = direction === "right" ? "flying-in-right"
            : direction === "up" ? "flying-in-top"
                : "entering";

        await playEntranceAnimation(returning, entranceClass);

        frontIdx = 1 - frontIdx;
        updateControls();
        busy = false;
    }

    async function likeCurrent(exitAnimFn) {
        if (busy || isExhausted()) return;
        const movie = order[pointer];
        if (!movie) return;
        movie.liked = true;
        try {
            await fetch(`/api/movies/${movie.id}/like`, { method: "POST" });
        } catch (err) {
            // ignore network errors — still advance locally
        }
        advance(exitAnimFn || ((el) => runExitAnimation(el, "flying-like")), "up");
    }

    // ---- Heart badge on the card itself — a direct like/unlike toggle that
    //      never moves the card. Independent from the skip/like swipe
    //      gestures below, which advance the card off the deck.
    async function toggleLikeOnCard(el) {
        if (!el || el !== frontEl()) return;
        const movie = order[pointer];
        if (!movie) return;

        const nextLiked = !movie.liked;
        movie.liked = nextLiked;
        setHeartState(el, nextLiked);

        btnLike.classList.toggle("is-liked", nextLiked);
        btnLike.title = nextLiked ? "Remove from watchlist" : "Add to watchlist";

        const heartBtn = el.querySelector(".like-heart");
        if (heartBtn) {
            heartBtn.classList.remove("pop");
            void heartBtn.offsetWidth;
            heartBtn.classList.add("pop");
            if (nextLiked) {
                const rect = heartBtn.getBoundingClientRect();
                spawnHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
        }

        try {
            await fetch(`/api/movies/${movie.id}/${nextLiked ? "like" : "unlike"}`, {
                method: "POST",
            });
        } catch (err) {
            // ignore network errors — local state already reflects the tap
        }
    }

    // ---- Heart pop (double-tap / swipe-up like) ---------------------------

    function spawnHeart(x, y) {
        const heart = document.createElement("div");
        heart.className = "heart-pop";
        heart.style.left = `${x}px`;
        heart.style.top = `${y}px`;
        heart.innerHTML = '<i class="fa-solid fa-heart"></i>';
        document.body.appendChild(heart);
        heart.addEventListener("animationend", () => heart.remove(), { once: true });
    }

    // ---- Shared actions — buttons and touch gestures both call these exact
    //      functions, so the behavior is identical no matter how it's triggered.

    function skipAction() {
        advance((el) => runExitAnimation(el, "flying-skip"), "right");
    }

    function prevAction() {
        goPrev();
    }

    function likeAction(x, y) {
        if (typeof x === "number") spawnHeart(x, y);
        likeCurrent((el) => runExitAnimation(el, "flying-like"));
    }

    // ---- Button / click handling ------------------------------------------

    function handleCardClick(e) {
        const target = e.target.closest("[data-action]");
        if (!target) return;
        const action = target.dataset.action;
        const el = frontEl();

        if (action === "toggle-like") {
            toggleLikeOnCard(el);
        } else if (action === "flip-info") {
            el.classList.add("flipped");
        } else if (action === "flip-front") {
            el.classList.remove("flipped");
        } else if (action === "show-trailer") {
            const movie = order[pointer];
            if (movie && movie.trailer_embed_url) {
                openTrailer(movie.trailer_embed_url);
            }
        }
    }

    cardA.addEventListener("click", handleCardClick);
    cardB.addEventListener("click", handleCardClick);

    function openTrailer(embedUrl) {
        trailerIframe.src = embedUrl + (embedUrl.includes("?") ? "&" : "?") + "autoplay=1";
        trailerModal.classList.remove("is-hidden");
    }

    function closeTrailer() {
        trailerModal.classList.add("is-hidden");
        trailerIframe.src = ""; // stop playback/audio
    }

    trailerModal.addEventListener("click", (e) => {
        if (e.target.closest("[data-action='close-trailer']")) {
            closeTrailer();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !trailerModal.classList.contains("is-hidden")) {
            closeTrailer();
        }
    });

    btnSkip.addEventListener("click", skipAction);
    btnPrev.addEventListener("click", prevAction);
    btnLike.addEventListener("click", () => {
        if (busy || isExhausted()) return;
        btnLike.classList.remove("pop");
        void btnLike.offsetWidth;
        btnLike.classList.add("pop");

        const willLike = !(order[pointer] && order[pointer].liked);
        if (willLike) {
            const rect = btnLike.getBoundingClientRect();
            spawnHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        toggleLikeOnCard(frontEl());
    });
    if (btnRestart) btnRestart.addEventListener("click", loadDeck);

    // ---- Touch: swipe right = skip, swipe left/down = previous,
    //      swipe up / double-tap = like -------------------------------------

    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let touchCurrentY = 0;
    let isTouchDragging = false;
    let activeTouchEl = null;
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    function onTouchStart(e, el) {
        if (busy) return;
        if (el !== frontEl()) return;
        if (el.classList.contains("flipped")) return; // let the info face scroll normally
        if (e.target.closest("[data-action]")) return; // let buttons behave normally

        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchCurrentX = touchStartX;
        touchCurrentY = touchStartY;
        isTouchDragging = true;
        activeTouchEl = el;
        el.style.transition = "none";
    }

    function onTouchMove(e, el) {
        if (!isTouchDragging || el !== activeTouchEl) return;
        const t = e.touches[0];
        touchCurrentX = t.clientX;
        touchCurrentY = t.clientY;
        const dx = touchCurrentX - touchStartX;
        const dy = touchCurrentY - touchStartY;
        const horizontal = Math.abs(dx) > Math.abs(dy);

        if (Math.abs(horizontal ? dx : dy) > 8) {
            e.preventDefault(); // claim the gesture, stop page scroll
        }

        // Only rightward (skip) and upward (like) visually drag the card —
        // left and down are just gestures that trigger "previous"; the card
        // itself never moves in those directions.
        if (horizontal && dx > 0) {
            const rotate = dx / 18;
            el.style.transform = `translateX(${dx}px) translateY(${dy * 0.12}px) rotateZ(${rotate}deg)`;
        } else if (!horizontal && dy < 0) {
            const rotate = dx / 24;
            el.style.transform = `translateY(${dy}px) translateX(${dx * 0.1}px) rotateZ(${rotate}deg)`;
        } else {
            el.style.transform = "";
        }
    }

    function onTouchEnd(e, el) {
        if (!isTouchDragging || el !== activeTouchEl) return;
        isTouchDragging = false;
        activeTouchEl = null;

        const dx = touchCurrentX - touchStartX;
        const dy = touchCurrentY - touchStartY;
        const dragDistance = Math.hypot(dx, dy);
        const horizontal = Math.abs(dx) > Math.abs(dy);

        if (horizontal && dx > SWIPE_THRESHOLD) {
            advance((cardEl) => finishDragExit(cardEl, 1, 0), "right");
        } else if (horizontal && dx < -SWIPE_THRESHOLD) {
            goPrev(); // card never moved left — previous one returns from the right
        } else if (!horizontal && dy < -SWIPE_THRESHOLD) {
            likeCurrent((cardEl) => finishDragExit(cardEl, 0, -1));
        } else if (!horizontal && dy > SWIPE_THRESHOLD) {
            goPrev(); // card never moved down — bring back the last dismissed card
        } else if (horizontal && dx > 0) {
            // partial rightward drag, released early — snap back
            el.style.transition = "transform 0.25s ease";
            el.style.transform = "translateX(0) translateY(0) rotateZ(0deg)";
            setTimeout(() => clearInlineTransform(el), 250);
        } else if (!horizontal && dy < 0) {
            // partial upward drag, released early — snap back
            el.style.transition = "transform 0.25s ease";
            el.style.transform = "translateX(0) translateY(0) rotateZ(0deg)";
            setTimeout(() => clearInlineTransform(el), 250);
        }

        // Double-tap-to-like — only counts as a "tap" if the finger barely moved
        if (dragDistance < 12) {
            const now = Date.now();
            const distFromLastTap = Math.hypot(touchCurrentX - lastTapX, touchCurrentY - lastTapY);

            if (now - lastTapTime < DOUBLE_TAP_WINDOW && distFromLastTap < DOUBLE_TAP_RADIUS) {
                lastTapTime = 0; // reset so a third tap doesn't chain into another double-tap
                if (!busy && !isExhausted()) {
                    likeAction(touchCurrentX, touchCurrentY);
                }
            } else {
                lastTapTime = now;
                lastTapX = touchCurrentX;
                lastTapY = touchCurrentY;
            }
        }
    }

    [cardA, cardB].forEach((el) => {
        el.addEventListener("touchstart", (e) => onTouchStart(e, el), { passive: true });
        el.addEventListener("touchmove", (e) => onTouchMove(e, el), { passive: false });
        el.addEventListener("touchend", (e) => onTouchEnd(e, el), { passive: true });
    });

    loadDeck();
})();
