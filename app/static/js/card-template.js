// Shared between deck.js and liked.js so a movie card looks and behaves
// exactly the same whether it's in the swipeable deck or expanded from the
// watchlist grid.
window.MovieCardTemplate = (function () {
    "use strict";

    function fmtMeta(movie) {
        const parts = [];
        if (movie.year) parts.push(movie.year);
        if (movie.rating) parts.push(`\u2605 ${movie.rating}`);
        return parts.join(" \u2022 ");
    }

    function heartHTML(liked) {
        return `
            <button type="button" class="like-heart${liked ? " is-liked" : ""}" data-action="toggle-like" title="${liked ? "Remove from watchlist" : "Add to watchlist"}" aria-pressed="${liked ? "true" : "false"}">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path d="M12 20.6s-7.2-4.4-9.8-8.9C.6 8.6 1.8 5 5.3 4c2.2-.6 4.3.3 5.5 2.1C11.9 4.3 14 3.4 16.2 4c3.5 1 4.7 4.6 3.1 7.7-2.6 4.5-9.8 8.9-9.8 8.9z"/>
                </svg>
            </button>
        `;
    }

    function frontHTML(movie) {
        return `
            <img src="${movie.poster_url}" alt="${movie.title}">
            ${heartHTML(!!movie.liked)}
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
            <button type="button" class="go-back-btn" data-action="flip-front">&larr; Back</button>
        `;
    }

    function loadMovieIntoCard(el, movie) {
        el.querySelector(".card-front").innerHTML = frontHTML(movie);
        el.querySelector(".card-back").innerHTML = backHTML(movie);
        el.classList.remove("flipped");
    }

    function setHeartState(el, liked) {
        const btn = el.querySelector(".like-heart");
        if (!btn) return;
        btn.classList.toggle("is-liked", !!liked);
        btn.setAttribute("aria-pressed", liked ? "true" : "false");
        btn.title = liked ? "Remove from watchlist" : "Add to watchlist";
    }

    return { fmtMeta, frontHTML, backHTML, loadMovieIntoCard, setHeartState };
})();
