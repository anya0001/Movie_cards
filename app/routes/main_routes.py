import uuid
import random

from flask import Blueprint, render_template, jsonify, request, make_response

from ..models import db, Movie, Like

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
    resp = make_response(render_template("index.html"))
    return ensure_session_cookie(resp)


@main.route("/liked")
def liked_page():
    resp = make_response(render_template("liked.html"))
    return ensure_session_cookie(resp)


@main.route("/api/movies")
def api_movies():
    """Return the deck of movies, shuffled, excluding ones already liked."""
    session_id = get_session_id()
    liked_ids = set()
    if session_id:
        liked_ids = {
            row.movie_id for row in Like.query.filter_by(session_id=session_id).all()
        }

    movies = Movie.query.order_by(Movie.id.asc()).all()
    deck = [m.to_dict() for m in movies if m.id not in liked_ids]
    random.shuffle(deck)
    return jsonify(deck)


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

    liked_ids = [row.movie_id for row in Like.query.filter_by(session_id=session_id).all()]
    movies = Movie.query.filter(Movie.id.in_(liked_ids)).all()
    return jsonify([m.to_dict() for m in movies])
