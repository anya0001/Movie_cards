# MovieCards — Project Plan

## 1. Concept
A swipeable deck of movie cards (poster front, flip-for-details back) styled like
Netflix — black background, dark red (`#8E1616`) accents, warm cream text
(`#F8EEDF` / `#E8C999`). Users skip, go back, or like a movie (saved to a
watchlist) without ever leaving the card. Admins manage the movie catalog
through a protected panel.

## 2. Color & Design System
| Token | Hex | Use |
|---|---|---|
| Main black | `#000000` | page background, card fronts |
| Main red | `#8E1616` | buttons, accents, like button, active states |
| Light gold | `#E8C999` | secondary text, borders, pill labels |
| Cream | `#F8EEDF` | headings, primary text on dark |

Supporting rules: glassmorphism (blurred translucent panels) for controls and
empty/loading states; soft large shadows under the card; rounded 22px corners;
Font Awesome icons; no bright/neon colors — everything stays in the red-black-
gold family so it reads as "Netflix," not "generic dark mode."

## 3. Pages / Screens
| Page | Route | Purpose |
|---|---|---|
| Discover (deck) | `/` | Main swipeable card experience |
| Watchlist | `/liked` | Grid of liked movies, remove option |
| Admin Login | `/admin/login` | Gate for the admin panel |
| Admin Dashboard | `/admin/` | List all movies, edit/delete |
| Add/Edit Movie | `/admin/movie/add`, `/admin/movie/<id>/edit` | Movie form |

Not built yet, but planned (see Roadmap): user accounts, search/filter bar,
genre browsing, movie detail deep-links, ratings/reviews.

## 4. The Card Component (the centerpiece)
- **Front face:** poster image, title, year, rating, genre line, "See more" button.
- **Back face (info):** scrollable panel — description, genre pills, director,
  runtime, cast, and a "Watch Trailer" button that swaps the panel for an
  embedded YouTube player *inside the same card* (no popup, no new page).
- **Reverse face:** a decorative red/black geometric pattern with a monogram —
  this is the true "back" of the physical card object, only glimpsed for an
  instant during the skip/like/undo flip animation. This replaces the leftover
  animation experiment from your prototypes with something intentional and on-brand.
- **Controls (outside the card):** Back (previous card), Skip (discard), Like
  (save to watchlist) — each with its own fly animation.

## 5. Tech Stack
- **Backend:** Python 3 + Flask (app factory pattern, blueprints)
- **Database:** SQLite via SQLAlchemy (swap `DATABASE_URL` for Postgres in production)
- **Frontend:** server-rendered Jinja templates + vanilla JS (no framework needed
  for this scope — keeps hosting cheap and simple)
- **Styling:** SCSS compiled to a single CSS file
- **Auth:** simple session-based admin login (single admin account via env vars).
  No user accounts for the public site yet — visitors are tracked by an
  anonymous long-lived cookie so their watchlist persists without signing up.

## 6. Data Model
**Movie:** title, poster_url, description, year, runtime_minutes, rating,
genres (comma list), director, cast (comma list), trailer_url.

**Like:** session_id (from cookie) + movie_id — one row per like, unique together.

## 7. What's Built Right Now (v1)
- Full Flask app with the schema above, seeded with 8 real sample movies
- `/api/movies`, `/api/movies/<id>/like`, `/api/movies/<id>/unlike`, `/api/liked`
- The full card deck experience described in section 4, working end-to-end
- Watchlist page with remove button
- Admin login + dashboard + add/edit/delete movie forms
- All routes and flows tested locally (auth, like/unlike, CRUD, deck exhaustion state)

## 8. Roadmap (v2 and beyond)
1. **Search & filters** — genre chips, year range, search bar in the header
2. **Real user accounts** — email/password or OAuth, so watchlists survive a
   cleared cookie/new device, plus "for you" recommendations
3. **Bulk import** — CSV/TMDB API import tool in the admin panel instead of
   one-by-one manual entry
4. **Image uploads** — let admins upload a poster file instead of pasting a URL
5. **Rate limiting / spam protection** on the like endpoint
6. **Categories page** — browse by genre instead of only the random deck
7. **Analytics** — most-liked movies, admin dashboard stats
8. **Mobile app wrapper** (Capacitor) if you want an actual app-store presence

## 9. Getting It Online
Recommended for this stack (Flask + SQLite): **Render** or **Railway** — both
have a free/cheap tier, detect Python apps automatically, and let you set
environment variables in a dashboard.

**Before deploying:**
- Set real values for `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (never
  keep the defaults in production)
- Switch `DATABASE_URL` to a managed Postgres instance if you expect real
  traffic — SQLite is fine for a demo/small audience but doesn't handle
  concurrent writes well
- Run with `gunicorn run:app` instead of the Flask dev server (already in
  `requirements.txt`)

**Render, step by step:**
1. Push this project to a GitHub repo
2. On Render: New → Web Service → connect the repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn run:app`
5. Add environment variables (`SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`)
6. Deploy — Render gives you a live `https://yourapp.onrender.com` URL

A custom domain can be pointed at that URL afterward from Render's dashboard
(or Railway's, if you go that route instead).

## 10. File Reference
See `README.md` in the project root for the file structure and local setup commands.
