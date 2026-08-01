from functools import wraps

from flask import (
    Blueprint, render_template, request, redirect, url_for, session,
    flash, current_app,
)

from ..models import db, Movie, GENRES

admin = Blueprint("admin", __name__, template_folder="../templates/admin")


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("is_admin"):
            return redirect(url_for("admin.login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


@admin.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if (
            username == current_app.config["ADMIN_USERNAME"]
            and password == current_app.config["ADMIN_PASSWORD"]
        ):
            session["is_admin"] = True
            next_url = request.args.get("next") or url_for("main.home")
            return redirect(next_url)
        flash("Invalid username or password.", "error")
    return render_template("admin/login.html")


@admin.route("/logout")
def logout():
    session.pop("is_admin", None)
    return redirect(url_for("admin.login"))


@admin.route("/")
@login_required
def dashboard():
    movies = Movie.query.order_by(Movie.created_at.desc()).all()
    return render_template("admin/dashboard.html", movies=movies)


def _movie_from_form(movie):
    movie.title = request.form.get("title", "").strip()
    movie.poster_url = request.form.get("poster_url", "").strip()
    movie.description = request.form.get("description", "").strip()

    year = request.form.get("year", "").strip()
    movie.year = int(year) if year.isdigit() else None

    runtime = request.form.get("runtime_minutes", "").strip()
    movie.runtime_minutes = int(runtime) if runtime.isdigit() else None

    rating = request.form.get("rating", "").strip()
    try:
        movie.rating = float(rating) if rating else None
    except ValueError:
        movie.rating = None

    selected_genres = [g for g in request.form.getlist("genres") if g in GENRES]
    movie.genres = ", ".join(selected_genres)
    movie.director = request.form.get("director", "").strip()
    movie.cast = request.form.get("cast", "").strip()
    movie.trailer_url = request.form.get("trailer_url", "").strip()
    return movie


@admin.route("/movie/add", methods=["GET", "POST"])
@login_required
def add_movie():
    if request.method == "POST":
        movie = _movie_from_form(Movie())
        db.session.add(movie)
        db.session.commit()
        flash(f'"{movie.title}" was added to the deck.', "success")
        return redirect(url_for("admin.dashboard"))
    return render_template("admin/add-movie.html", movie=None, all_genres=GENRES)


@admin.route("/movie/<int:movie_id>/edit", methods=["GET", "POST"])
@login_required
def edit_movie(movie_id):
    movie = Movie.query.get_or_404(movie_id)
    if request.method == "POST":
        _movie_from_form(movie)
        db.session.commit()
        flash(f'"{movie.title}" was updated.', "success")
        return redirect(url_for("admin.dashboard"))
    return render_template("admin/add-movie.html", movie=movie, all_genres=GENRES)


@admin.route("/movie/<int:movie_id>/delete", methods=["POST"])
@login_required
def delete_movie(movie_id):
    movie = Movie.query.get_or_404(movie_id)
    title = movie.title
    db.session.delete(movie)
    db.session.commit()
    flash(f'"{title}" was removed.', "success")
    return redirect(url_for("admin.dashboard"))
