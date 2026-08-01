(function () {
    "use strict";

    const { loadMovieIntoCard } = window.MovieCardTemplate;

    const searchInput = document.getElementById("adminTableSearch");
    const table = document.getElementById("adminTable");
    const noResults = document.getElementById("adminTableNoResults");
    const rows = table ? Array.from(table.querySelectorAll("tbody tr[data-id]")) : [];

    const overlay = document.getElementById("adminOverlay");
    const overlayBackdrop = overlay ? overlay.querySelector(".liked-overlay-backdrop") : null;
    const detailCard = document.getElementById("adminDetailCard");

    const trailerModal = document.getElementById("trailerModal");
    const trailerIframe = document.getElementById("trailerIframe");

    let moviesById = {};
    let activeSourceEl = null;
    let overlayBusy = false;

    // ---- Mini search — filters the table rows in place. This is a small,
    //      page-local tool (not the global header search), so live filtering
    //      as you type is the expected, standard behavior here. -------------

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const q = searchInput.value.trim().toLowerCase();
            let visibleCount = 0;

            rows.forEach((row) => {
                const match = !q || row.dataset.title.includes(q);
                row.hidden = !match;
                if (match) visibleCount += 1;
            });

            if (noResults) noResults.hidden = visibleCount > 0 || rows.length === 0;
        });
    }

    // ---- "Viewable" rows — click a movie to preview exactly how it looks
    //      to users on the deck, using the same FLIP-style expand animation
    //      as the watchlist page. --------------------------------------------

    async function loadAllMovies() {
        try {
            const res = await fetch("/api/movies/all");
            const data = await res.json();
            data.forEach((m) => { moviesById[m.id] = m; });
        } catch (err) {
            moviesById = {};
        }
    }

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

        loadMovieIntoCard(detailCard, Object.assign({}, movie, { liked: false }));
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

        setTimeout(() => { overlayBusy = false; }, 500);
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

    if (table) {
        table.addEventListener("click", (e) => {
            const cell = e.target.closest('[data-action="view"]');
            if (!cell) return;
            const row = e.target.closest("tr[data-id]");
            if (!row) return;

            const movie = moviesById[row.dataset.id];
            if (movie) openDetail(movie, cell);
        });
    }

    detailCard.addEventListener("click", (e) => {
        const target = e.target.closest("[data-action]");
        if (!target) return;
        const action = target.dataset.action;

        if (action === "flip-info") {
            detailCard.classList.add("flipped");
        } else if (action === "flip-front") {
            detailCard.classList.remove("flipped");
        } else if (action === "show-trailer") {
            const row = activeSourceEl ? activeSourceEl.closest("tr[data-id]") : null;
            const movie = row ? moviesById[row.dataset.id] : null;
            if (movie && movie.trailer_embed_url) openTrailer(movie.trailer_embed_url);
        }
        // toggle-like is intentionally a no-op here — this is a preview of
        // how the card looks to users, not a real watchlist action.
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

    loadAllMovies();
})();
