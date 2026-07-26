(function () {
    "use strict";

    const deckLoading = document.getElementById("deckLoading");
    const deckEmpty = document.getElementById("deckEmpty");
    const movieCard = document.getElementById("movieCard");
    const cardInner = document.getElementById("cardInner");
    const cardFront = document.getElementById("cardFront");
    const cardBack = document.getElementById("cardBack");

    const btnPrev = document.getElementById("btnPrev");
    const btnSkip = document.getElementById("btnSkip");
    const btnLike = document.getElementById("btnLike");
    const btnRestart = document.getElementById("btnRestart");

    const trailerModal = document.getElementById("trailerModal");
    const trailerIframe = document.getElementById("trailerIframe");

    let order = [];
    let pointer = 0;
    let busy = false; // guards against double-clicks mid-animation

    function fmtMeta(movie) {
        const parts = [];
        if (movie.year) parts.push(movie.year);
        if (movie.rating) parts.push(`\u2605 ${movie.rating}`);
        return parts.join(" \u2022 ");
    }

    function frontHTML(movie) {
        return `
            <img src="${movie.poster_url}" alt="${movie.title}">
            <div class="info">
                <h3>${movie.title}</h3>
                <p class="meta">${fmtMeta(movie)}</p>
                <p class="genres-line">${movie.genres.join(", ")}</p>
                <button type="button" class="see-more-btn" data-action="flip-info">
                    <i class="fa-solid fa-circle-info"></i> See more
                </button>
            </div>
        `;
    }

    function backHTML(movie) {
        const director = movie.director
            ? `<p class="detail-row"><strong>Director:</strong> ${movie.director}</p>`
            : "";
        const runtime = movie.runtime_minutes
            ? `<p class="detail-row"><strong>Runtime:</strong> ${movie.runtime_minutes} min</p>`
            : "";
        const cast = movie.cast && movie.cast.length
            ? `<p class="detail-row"><strong>Cast:</strong> ${movie.cast.join(", ")}</p>`
            : "";
        const trailerBtn = movie.trailer_embed_url
            ? `<button type="button" class="trailer-btn" data-action="show-trailer">
                   <i class="fa-solid fa-play"></i> Watch Trailer
               </button>`
            : "";

        return `
            <div class="info-scroll" data-panel="info">
                <h3>${movie.title}</h3>
                <p class="sub-meta">${fmtMeta(movie)}</p>
                <p class="description">${movie.description}</p>
                <div class="genre-pills">
                    ${movie.genres.map((g) => `<span class="genre-pill">${g}</span>`).join("")}
                </div>
                ${director}
                ${runtime}
                ${cast}
                ${trailerBtn}
            </div>
            <button type="button" class="go-back-btn" data-action="flip-front">Back</button>
        `;
    }

    function render(movie) {
        cardFront.innerHTML = frontHTML(movie);
        cardBack.innerHTML = backHTML(movie);
        movieCard.classList.remove("flipped");
    }

    function showCard() {
        deckLoading.classList.add("is-hidden");
        deckEmpty.classList.add("is-hidden");
        movieCard.classList.remove("is-hidden");
    }

    function showEmpty() {
        movieCard.classList.add("is-hidden");
        deckEmpty.classList.remove("is-hidden");
    }

    function isExhausted() {
        return order.length === 0 || pointer >= order.length;
    }

    function updateControls() {
        btnPrev.disabled = pointer <= 0;
        btnSkip.disabled = isExhausted();
        btnLike.disabled = isExhausted();
    }

    async function loadDeck() {
        deckLoading.classList.remove("is-hidden");
        movieCard.classList.add("is-hidden");
        deckEmpty.classList.add("is-hidden");

        try {
            const res = await fetch("/api/movies");
            order = await res.json();
        } catch (err) {
            order = [];
        }

        pointer = 0;
        updateControls();

        if (order.length === 0) {
            showEmpty();
            return;
        }

        render(order[pointer]);
        showCard();
    }

    function runExitAnimation(className) {
        return new Promise((resolve) => {
            movieCard.classList.add(className);
            movieCard.addEventListener(
                "animationend",
                function handler() {
                    movieCard.removeEventListener("animationend", handler);
                    movieCard.classList.remove(className);
                    resolve();
                },
                { once: true }
            );
        });
    }

    function playEnterAnimation(className) {
        movieCard.classList.add(className);
        movieCard.addEventListener(
            "animationend",
            function handler() {
                movieCard.removeEventListener("animationend", handler);
                movieCard.classList.remove(className);
            },
            { once: true }
        );
    }

    async function advance(exitClass) {
        if (busy || isExhausted()) return;
        busy = true;

        await runExitAnimation(exitClass);

        pointer += 1;
        if (pointer >= order.length) {
            showEmpty();
            updateControls();
            busy = false;
            return;
        }

        render(order[pointer]);
        updateControls();
        playEnterAnimation("entering");
        busy = false;
    }

    async function goPrev() {
        if (busy || pointer <= 0) return;
        busy = true;

        pointer -= 1;
        render(order[pointer]);
        deckEmpty.classList.add("is-hidden");
        movieCard.classList.remove("is-hidden");
        updateControls();
        playEnterAnimation("flying-in");
        busy = false;
    }

    async function likeCurrent() {
        if (busy || isExhausted()) return;
        const movie = order[pointer];
        if (!movie) return;
        try {
            await fetch(`/api/movies/${movie.id}/like`, { method: "POST" });
        } catch (err) {
            // ignore network errors — still advance locally
        }
        advance("flying-like");
    }

    // Event delegation for buttons inside the card (re-rendered each time)
    movieCard.addEventListener("click", (e) => {
        const target = e.target.closest("[data-action]");
        if (!target) return;
        const action = target.dataset.action;

        if (action === "flip-info") {
            movieCard.classList.add("flipped");
        } else if (action === "flip-front") {
            movieCard.classList.remove("flipped");
        } else if (action === "show-trailer") {
            const movie = order[pointer];
            if (movie && movie.trailer_embed_url) {
                openTrailer(movie.trailer_embed_url);
            }
        }
    });

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

    btnSkip.addEventListener("click", () => advance("flying-skip"));
    btnLike.addEventListener("click", likeCurrent);
    btnPrev.addEventListener("click", goPrev);
    if (btnRestart) btnRestart.addEventListener("click", loadDeck);

    loadDeck();
})();
