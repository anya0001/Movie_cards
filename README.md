# MovieCards

A Tinder-style swipe deck for discovering movies. Netflix-inspired dark red/black
design. Flask + SQLite backend, vanilla JS frontend, with a working admin panel.

## Features
- Swipeable movie card deck: flip for details, skip, go back, or like (save to watchlist)
- In-card trailer playback (no navigating away from the card)
- Watchlist page — persisted per-browser via a long-lived cookie, no account needed
- Admin panel to add / edit / delete movies (protected login)
- Seeded with 8 sample movies on first run

## Quick start (local)

```bash
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then edit .env with your own values
export $(cat .env | xargs)      # or use python-dotenv / your OS's env loader

python run.py
```

Visit **http://127.0.0.1:5000** for the deck, and **http://127.0.0.1:5000/admin/login**
for the admin panel (default admin / changeme123 — change this via `.env` before
deploying anywhere real).

## Editing styles
Source styles live in `app/scss/`. If you edit them, recompile with:

```bash
npm install -g sass
sass app/scss/style.scss app/static/css/style.css --no-source-map --style=expanded
```

(Or use the VS Code "Live Sass Compiler" extension, watching `app/scss/style.scss`.)

## Project structure
```
app/
  __init__.py        app factory, DB init, seed data
  models.py           Movie + Like SQLAlchemy models
  routes/
    main_routes.py    public site + JSON API
    admin_routes.py    admin login/dashboard/CRUD
  templates/           Jinja templates
  static/
    css/style.css      compiled CSS
    js/deck.js          card deck logic
    js/liked.js         watchlist page logic
  scss/                 SCSS source
config.py               app config (reads from environment)
run.py                  entrypoint
```

See `PROJECT_PLAN.md` for the full product plan, architecture notes, and deployment guide.
