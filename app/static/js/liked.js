(function () {
    "use strict";

    const { loadMovieIntoCard } = window.MovieCardTemplate;

    const grid = document.getElementById("likedGrid");
    const emptyState = document.getElementById("likedEmpty");

    const overlay = document.getElementById("likedOverlay");
    const overlayBackdrop = overlay ? overlay.querySelector(".liked-overlay-backdrop") : null;
    const detailCard = document.getElementById("likedDetailCard");

    const trailerModal = document.getElementById("trailerModal");
    const trailerIframe = document.getElementById("trailerIframe");

    let movies = [];
    let activeSourceEl = null;
    let overlayBusy = false;

    function thumbHTML(movie) {
        return `
            <img src="${movie.poster_url}" alt="${movie.title}" loading="lazy">
            <button type="button" class="unlike-btn" data-action="unlike" title="Remove from watchlist">
                <i class="fa-solid fa-heart"></i>
            </button>
            <div class="liked-info">
                <h4>${movie.title}</h4>
                <span>${movie.year || ""}</span>
            </div>
        `;
    }

    function render() {
        if (movies.length === 0) {
            grid.innerHTML = "";
            emptyState.hidden = false;
            return;
        }
        emptyState.hidden = true;
        grid.innerHTML = movies
            .map((movie) => `<div class="liked-card" data-id="${movie.id}">${thumbHTML(movie)}</div>`)
            .join("");
    }

    async function loadLiked() {
        const res = await fetch("/api/liked");
        movies = await res.json(); // already ordered most-recently-added-first by the server
        render();
    }

    function removeMovie(movieId) {
        movies = movies.filter((m) => String(m.id) !== String(movieId));
        const card = grid.querySelector(`.liked-card[data-id="${movieId}"]`);
        if (card) card.remove();
        if (!movies.length) emptyState.hidden = false;
    }

    // ---- Detail overlay — expands the clicked thumbnail into a full,
    //      flippable deck-style card, using a FLIP animation so it visually
    //      grows out of the spot it was clicked from, leaving that grid slot
    //      blank behind a faded black backdrop. ------------------------------

    function openTrailer(embedUrl) {
        trailerIframe.src = embedUrl + (embedUrl.includes("?") ? "&" : "?") + "autoplay=1";
        trailerModal.classList.remove("is-hidden");
    }

    function closeTrailer() {
        trailerModal.classList.add("is-hidden");
        trailerIframe.src = "";
    }

    function openDetail(movie, sourceEl) {
        if (overlayBusy) return;
        overlayBusy = true;

        loadMovieIntoCard(detailCard, movie);
        activeSourceEl = sourceEl;
        sourceEl.classList.add("is-source-active"); // leaves a blank slot behind

        overlay.classList.remove("is-hidden");
        detailCard.style.transition = "none";

        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = detailCard.getBoundingClientRect();
        const scaleX = sourceRect.width / targetRect.width;
        const scaleY = sourceRect.height / targetRect.height;
        const dx = (sourceRect.left + sourceRect.width / 2) - (targetRect.left + targetRect.width / 2);
        const dy = (sourceRect.top + sourceRect.height / 2) - (targetRect.top + targetRect.height / 2);

        detailCard.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
        detailCard.style.opacity = "0.5";

        requestAnimationFrame(() => {
            void detailCard.offsetWidth; // commit the starting transform before animating
            detailCard.style.transition =
                "transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.35s ease";
            detailCard.style.transform = "translate(0, 0) scale(1, 1)";
            detailCard.style.opacity = "1";
            overlay.classList.add("is-visible");
        });

        setTimeout(() => {
            overlayBusy = false;
        }, 500);
    }

    function closeDetail() {
        if (overlayBusy || overlay.classList.contains("is-hidden")) return;
        overlayBusy = true;
        detailCard.classList.remove("flipped");

        const sourceEl = activeSourceEl;
        overlay.classList.remove("is-visible");

        if (sourceEl) {
            const sourceRect = sourceEl.getBoundingClientRect();
            const targetRect = detailCard.getBoundingClientRect();
            const scaleX = sourceRect.width / targetRect.width;
            const scaleY = sourceRect.height / targetRect.height;
            const dx = (sourceRect.left + sourceRect.width / 2) - (targetRect.left + targetRect.width / 2);
            const dy = (sourceRect.top + sourceRect.height / 2) - (targetRect.top + targetRect.height / 2);

            detailCard.style.transition =
                "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease";
            detailCard.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
            detailCard.style.opacity = "0.4";
        } else {
            detailCard.style.transition = "opacity 0.3s ease";
            detailCard.style.opacity = "0";
        }

        setTimeout(() => {
            overlay.classList.add("is-hidden");
            detailCard.style.transition = "none";
            detailCard.style.transform = "";
            detailCard.style.opacity = "";
            if (sourceEl) sourceEl.classList.remove("is-source-active");
            activeSourceEl = null;
            overlayBusy = false;
        }, 420);
    }

    async function unlikeFromDetail(movieId) {
        try {
            await fetch(`/api/movies/${movieId}/unlike`, { method: "POST" });
        } catch (err) {
            // ignore network errors — still leaves the watchlist locally
        }
        removeMovie(movieId);
        closeDetail();
    }

    grid.addEventListener("click", (e) => {
        const unlikeBtn = e.target.closest('[data-action="unlike"]');
        const card = e.target.closest(".liked-card");
        if (!card) return;
        const movieId = card.dataset.id;

        if (unlikeBtn) {
            fetch(`/api/movies/${movieId}/unlike`, { method: "POST" }).catch(() => {});
            removeMovie(movieId);
            return;
        }

        const movie = movies.find((m) => String(m.id) === String(movieId));
        if (movie) openDetail(Object.assign({}, movie, { liked: true }), card);
    });

    detailCard.addEventListener("click", (e) => {
        const target = e.target.closest("[data-action]");
        if (!target) return;
        const action = target.dataset.action;
        const activeId = activeSourceEl ? activeSourceEl.dataset.id : null;

        if (action === "toggle-like") {
            if (activeId) unlikeFromDetail(activeId);
        } else if (action === "flip-info") {
            detailCard.classList.add("flipped");
        } else if (action === "flip-front") {
            detailCard.classList.remove("flipped");
        } else if (action === "show-trailer") {
            const movie = movies.find((m) => String(m.id) === String(activeId));
            if (movie && movie.trailer_embed_url) openTrailer(movie.trailer_embed_url);
        }
    });

    if (overlayBackdrop) overlayBackdrop.addEventListener("click", closeDetail);

    trailerModal.addEventListener("click", (e) => {
        if (e.target.closest("[data-action='close-trailer']")) closeTrailer();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (!trailerModal.classList.contains("is-hidden")) {
            closeTrailer();
        } else if (!overlay.classList.contains("is-hidden")) {
            closeDetail();
        }
    });

    loadLiked();
})();
