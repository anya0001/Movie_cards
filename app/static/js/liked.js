(function () {
    "use strict";

    const grid = document.getElementById("likedGrid");
    const emptyState = document.getElementById("likedEmpty");

    function cardHTML(movie) {
        return `
            <div class="liked-card" data-id="${movie.id}">
                <img src="${movie.poster_url}" alt="${movie.title}">
                <button class="unlike-btn" data-action="unlike" title="Remove">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="liked-info">
                    <h4>${movie.title}</h4>
                    <span>${movie.year || ""}</span>
                </div>
            </div>
        `;
    }

    async function loadLiked() {
        const res = await fetch("/api/liked");
        const movies = await res.json();

        if (movies.length === 0) {
            grid.innerHTML = "";
            emptyState.hidden = false;
            return;
        }

        emptyState.hidden = true;
        grid.innerHTML = movies.map(cardHTML).join("");
    }

    grid.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-action="unlike"]');
        if (!btn) return;
        const card = btn.closest(".liked-card");
        const movieId = card.dataset.id;

        await fetch(`/api/movies/${movieId}/unlike`, { method: "POST" });
        card.remove();

        if (!grid.children.length) {
            emptyState.hidden = false;
        }
    });

    loadLiked();
})();
