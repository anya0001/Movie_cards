(function () {
    "use strict";

    const { loadMovieIntoCard, setHeartState } = window.MovieCardTemplate;

    const grid = document.getElementById("categoriesGrid");
    const emptyState = document.getElementById("categoriesEmpty");
    const heading = document.getElementById("categoriesHeading");
    const shuffleBtn = document.getElementById("shuffleBtn");
    const genreList = document.getElementById("genreList");

    const searchInput = document.getElementById("siteSearchInput");

    const overlay = document.getElementById("likedOverlay");
    const overlayBackdrop = overlay ? overlay.querySelector(".liked-overlay-backdrop") : null;
    const detailCard = document.getElementById("likedDetailCard");

    const trailerModal = document.getElementById("trailerModal");
    const trailerIframe = document.getElementById("trailerIframe");

    let movies = [];
    let activeGenre = "";
    let activeSourceEl = null;
    let overlayBusy = false;

    function thumbHTML(movie) {
        return `
            <img src="${movie.poster_url}" alt="${movie.title}" loading="lazy">
            <button type="button" class="cat-like-btn${movie.liked ? " is-liked" : ""}" data-action="toggle-like" title="${movie.liked ? "Remove from watchlist" : "Add to watchlist"}">
                <i class="fa-solid fa-heart"></i>
            </button>
            <div class="liked-info">
                <h4>${movie.title}</h4>
                <span>${movie.year || ""}</span>
            </div>
        `;
    }

    function visibleMovies() {
        const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
        return movies.filter((movie) => {
            if (activeGenre && !(movie.genres || []).includes(activeGenre)) return false;
            if (q && !movie.title.toLowerCase().includes(q)) return false;
            return true;
        });
    }

    function render() {
        const shown = visibleMovies();

        if (shown.length === 0) {
            grid.innerHTML = "";
            emptyState.hidden = false;
            return;
        }

        emptyState.hidden = true;
        grid.innerHTML = shown
            .map((movie) => `<div class="liked-card cat-card" data-id="${movie.id}">${thumbHTML(movie)}</div>`)
            .join("");
    }

    async function loadMovies() {
        const res = await fetch("/api/movies/all");
        movies = await res.json();
        render();
    }

    function setGenre(genre) {
        activeGenre = genre;
        genreList.querySelectorAll(".genre-item").forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.genre === genre);
        });
        heading.textContent = genre ? genre + " Movies" : "All Movies";
        render();
    }

    function shuffleVisible() {
        // Shuffle only the movies currently in view, in place within the
        // full `movies` array, so the filter stays applied after shuffling.
        const shownIds = new Set(visibleMovies().map((m) => m.id));
        const shownMovies = movies.filter((m) => shownIds.has(m.id));
        for (let i = shownMovies.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shownMovies[i], shownMovies[j]] = [shownMovies[j], shownMovies[i]];
        }
        let cursor = 0;
        movies = movies.map((m) => (shownIds.has(m.id) ? shownMovies[cursor++] : m));
        render();

        shuffleBtn.classList.remove("spin");
        void shuffleBtn.offsetWidth;
        shuffleBtn.classList.add("spin");
    }

    function setLikedState(movieId, liked) {
        const movie = movies.find((m) => String(m.id) === String(movieId));
        if (movie) movie.liked = liked;

        const card = grid.querySelector(`.cat-card[data-id="${movieId}"]`);
        if (card) {
            const btn = card.querySelector(".cat-like-btn");
            if (btn) {
                btn.classList.toggle("is-liked", liked);
                btn.title = liked ? "Remove from watchlist" : "Add to watchlist";
            }
        }

        if (activeSourceEl && String(activeSourceEl.dataset.id) === String(movieId)) {
            setHeartState(detailCard, liked);
        }
    }

    async function toggleLike(movieId) {
        const movie = movies.find((m) => String(m.id) === String(movieId));
        if (!movie) return;
        const nextLiked = !movie.liked;
        setLikedState(movieId, nextLiked);
        try {
            await fetch(`/api/movies/${movieId}/${nextLiked ? "like" : "unlike"}`, { method: "POST" });
        } catch (err) {
            // network hiccup — local state stays as the user's intent, harmless either way
        }
    }

    // ---- Detail overlay — same expand-in-place pattern as the watchlist ----

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
        sourceEl.classList.add("is-source-active");

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
            void detailCard.offsetWidth;
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

    grid.addEventListener("click", (e) => {
        const likeBtn = e.target.closest('[data-action="toggle-like"]');
        const card = e.target.closest(".cat-card");
        if (!card) return;
        const movieId = card.dataset.id;

        if (likeBtn) {
            toggleLike(movieId);
            return;
        }

        const movie = movies.find((m) => String(m.id) === String(movieId));
        if (movie) openDetail(movie, card);
    });

    detailCard.addEventListener("click", (e) => {
        const target = e.target.closest("[data-action]");
        if (!target) return;
        const action = target.dataset.action;
        const activeId = activeSourceEl ? activeSourceEl.dataset.id : null;

        if (action === "toggle-like") {
            if (activeId) toggleLike(activeId);
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

    genreList.addEventListener("click", (e) => {
        const btn = e.target.closest(".genre-item");
        if (!btn) return;
        setGenre(btn.dataset.genre || "");
    });

    if (shuffleBtn) shuffleBtn.addEventListener("click", shuffleVisible);
    if (searchInput) searchInput.addEventListener("input", render);

    loadMovies();
})();
