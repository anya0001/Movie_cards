// Global header search: autocomplete-only while typing (never touches the
// page behind it), and a real search only on Enter / the search button /
// clicking a suggestion — all of which just submit the form to /categories.
(function () {
    "use strict";

    const form = document.getElementById("siteSearchForm");
    const input = document.getElementById("siteSearchInput");
    const dropdown = document.getElementById("searchSuggestions");

    if (!form || !input || !dropdown) return; // header search not on this page

    const DEBOUNCE_MS = 250;

    let debounceTimer = null;
    let suggestions = [];
    let activeIndex = -1;
    let requestToken = 0;

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    // Wrap the part of the title that matches the query in <mark>, so the
    // match is visually highlighted in the dropdown.
    function highlightMatch(title, query) {
        const safeTitle = escapeHTML(title);
        if (!query) return safeTitle;
        const idx = title.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return safeTitle;
        const before = escapeHTML(title.slice(0, idx));
        const match = escapeHTML(title.slice(idx, idx + query.length));
        const after = escapeHTML(title.slice(idx + query.length));
        return `${before}<mark>${match}</mark>${after}`;
    }

    function suggestionHTML(movie, query, index) {
        return `
            <li class="search-suggestion" data-index="${index}" data-title="${escapeHTML(movie.title)}" role="option">
                <img src="${movie.poster_url}" alt="" loading="lazy">
                <span class="suggestion-text">
                    <span class="suggestion-title">${highlightMatch(movie.title, query)}</span>
                    <span class="suggestion-year">${movie.year || ""}</span>
                </span>
            </li>
        `;
    }

    function renderDropdown(query) {
        if (suggestions.length === 0) {
            dropdown.innerHTML = `<div class="search-no-suggestions">No matches</div>`;
        } else {
            dropdown.innerHTML = `<ul class="search-suggestion-list" role="listbox">
                ${suggestions.map((m, i) => suggestionHTML(m, query, i)).join("")}
            </ul>`;
        }
        dropdown.classList.remove("is-hidden");
        setActiveIndex(-1);
    }

    function closeDropdown() {
        dropdown.classList.add("is-hidden");
        dropdown.innerHTML = "";
        suggestions = [];
        activeIndex = -1;
    }

    function setActiveIndex(index) {
        const items = dropdown.querySelectorAll(".search-suggestion");
        items.forEach((item) => item.classList.remove("is-active"));
        activeIndex = index;
        if (index >= 0 && items[index]) {
            items[index].classList.add("is-active");
            items[index].scrollIntoView({ block: "nearest" });
        }
    }

    function submitWithTitle(title) {
        input.value = title;
        closeDropdown();
        form.requestSubmit ? form.requestSubmit() : form.submit();
    }

    async function fetchSuggestions(query) {
        const myToken = ++requestToken;
        try {
            const res = await fetch(`/api/movies/suggest?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (myToken !== requestToken) return; // a newer request has since started — ignore this stale one
            suggestions = data;
            renderDropdown(query);
        } catch (err) {
            if (myToken !== requestToken) return;
            suggestions = [];
            closeDropdown();
        }
    }

    input.addEventListener("input", () => {
        const query = input.value.trim();
        clearTimeout(debounceTimer);

        if (!query) {
            closeDropdown();
            return;
        }

        debounceTimer = setTimeout(() => fetchSuggestions(query), DEBOUNCE_MS);
    });

    input.addEventListener("keydown", (e) => {
        const hasSuggestions = !dropdown.classList.contains("is-hidden") && suggestions.length > 0;

        if (e.key === "ArrowDown") {
            if (!hasSuggestions) return;
            e.preventDefault();
            if (activeIndex >= suggestions.length - 1) {
                setActiveIndex(-1); // past the last suggestion — back to the text field
            } else {
                setActiveIndex(activeIndex + 1);
            }
        } else if (e.key === "ArrowUp") {
            if (!hasSuggestions) return;
            e.preventDefault();
            if (activeIndex <= -1) {
                setActiveIndex(suggestions.length - 1); // from the text field — jump to the last suggestion
            } else if (activeIndex === 0) {
                setActiveIndex(-1); // past the first suggestion — back to the text field
            } else {
                setActiveIndex(activeIndex - 1);
            }
        } else if (e.key === "Enter") {
            if (hasSuggestions && activeIndex >= 0) {
                e.preventDefault();
                submitWithTitle(suggestions[activeIndex].title);
            }
            // else: let the form submit natively with whatever was typed
        } else if (e.key === "Escape") {
            closeDropdown();
        }
    });

    dropdown.addEventListener("mousemove", (e) => {
        const item = e.target.closest(".search-suggestion");
        if (!item) return;
        const index = Number(item.dataset.index);
        if (index !== activeIndex) setActiveIndex(index);
    });

    dropdown.addEventListener("click", (e) => {
        const item = e.target.closest(".search-suggestion");
        if (!item) return;
        submitWithTitle(item.dataset.title);
    });

    document.addEventListener("click", (e) => {
        if (!form.contains(e.target)) closeDropdown();
    });

    form.addEventListener("submit", () => {
        closeDropdown();
    });
})();
