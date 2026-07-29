import uuid
import random

from flask import Blueprint, render_template, jsonify, request, make_response

from ..models import db, Movie, Like, GENRES

main = Blueprint("main", __name__)

SESSION_COOKIE = "mc_session"


def get_session_id():
    return request.cookies.get(SESSION_COOKIE)


def ensure_session_cookie(response):
    if not request.cookies.get(SESSION_COOKIE):
        response.set_cookie(
            SESSION_COOKIE,
            str(uuid.uuid4()),
            max_age=60 * 60 * 24 * 365 * 2,  # 2 years
            samesite="Lax",
        )
    return response


@main.route("/")
def home():
    resp = make_response(render_template("index.html", all_genres=GENRES))
    return ensure_session_cookie(resp)


@main.route("/liked")
def liked_page():
    resp = make_response(render_template("liked.html", all_genres=GENRES))
    return ensure_session_cookie(resp)


@main.route("/categories")
def categories_page():
    resp = make_response(render_template("categories.html", all_genres=GENRES))
    return ensure_session_cookie(resp)


@main.route("/api/movies")
def api_movies():
    """Return the deck of movies, shuffled, excluding ones already liked.
    Optionally filtered by a title search (?q=) and/or a genre (?genre=)."""
    session_id = get_session_id()
    liked_ids = set()
    if session_id:
        liked_ids = {
            row.movie_id for row in Like.query.filter_by(session_id=session_id).all()
        }

    query = request.args.get("q", "").strip().lower()
    genre = request.args.get("genre", "").strip()

    movies = Movie.query.order_by(Movie.id.asc()).all()
    deck = []
    for m in movies:
        if m.id in liked_ids:
            continue
        if query and query not in m.title.lower():
            continue
        if genre and genre not in m.genre_list():
            continue
        deck.append(m.to_dict())
    random.shuffle(deck)
    return jsonify(deck)


@main.route("/api/movies/all")
def api_movies_all():
    """Return every movie (unfiltered by like status), each tagged with
    whether the current session has liked it. Used by the Categories page."""
    session_id = get_session_id()
    liked_ids = set()
    if session_id:
        liked_ids = {
            row.movie_id for row in Like.query.filter_by(session_id=session_id).all()
        }

    movies = Movie.query.order_by(Movie.id.asc()).all()
    out = []
    for m in movies:
        data = m.to_dict()
        data["liked"] = m.id in liked_ids
        out.append(data)
    return jsonify(out)


@main.route("/api/movies/<int:movie_id>/like", methods=["POST"])
def like_movie(movie_id):
    movie = Movie.query.get_or_404(movie_id)
    session_id = get_session_id() or str(uuid.uuid4())

    existing = Like.query.filter_by(session_id=session_id, movie_id=movie.id).first()
    if not existing:
        db.session.add(Like(session_id=session_id, movie_id=movie.id))
        db.session.commit()

    resp = jsonify({"status": "liked", "movie_id": movie.id})
    if not request.cookies.get(SESSION_COOKIE):
        resp.set_cookie(
            SESSION_COOKIE, session_id, max_age=60 * 60 * 24 * 365 * 2, samesite="Lax"
        )
    return resp


@main.route("/api/movies/<int:movie_id>/unlike", methods=["POST"])
def unlike_movie(movie_id):
    session_id = get_session_id()
    if session_id:
        Like.query.filter_by(session_id=session_id, movie_id=movie_id).delete()
        db.session.commit()
    return jsonify({"status": "unliked", "movie_id": movie_id})


@main.route("/api/liked")
def api_liked():
    session_id = get_session_id()
    if not session_id:
        return jsonify([])

    # Most-recently-liked first, so the watchlist reads as "recently added".
    likes = (
        Like.query.filter_by(session_id=session_id)
        .order_by(Like.created_at.desc(), Like.id.desc())
        .all()
    )
    liked_ids_in_order = [row.movie_id for row in likes]
    movies_by_id = {
        m.id: m for m in Movie.query.filter(Movie.id.in_(liked_ids_in_order)).all()
    }
    return jsonify([
        movies_by_id[mid].to_dict() for mid in liked_ids_in_order if mid in movies_by_id
    ])
