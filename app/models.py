from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


class Movie(db.Model):
    __tablename__ = "movies"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    poster_url = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    year = db.Column(db.Integer, nullable=True)
    runtime_minutes = db.Column(db.Integer, nullable=True)
    rating = db.Column(db.Float, nullable=True)
    genres = db.Column(db.String(300), nullable=False, default="")  # comma-separated
    director = db.Column(db.String(150), nullable=True)
    cast = db.Column(db.String(500), nullable=True)  # comma-separated names
    trailer_url = db.Column(db.String(500), nullable=True)  # YouTube URL
    created_at = db.Column(db.DateTime, default=utcnow)

    likes = db.relationship("Like", backref="movie", cascade="all, delete-orphan")

    def genre_list(self):
        return [g.strip() for g in self.genres.split(",") if g.strip()]

    def cast_list(self):
        if not self.cast:
            return []
        return [c.strip() for c in self.cast.split(",") if c.strip()]

    def trailer_embed_url(self):
        """Convert a YouTube watch/short URL into an embeddable URL."""
        if not self.trailer_url:
            return None
        url = self.trailer_url.strip()
        video_id = None
        if "watch?v=" in url:
            video_id = url.split("watch?v=")[-1].split("&")[0]
        elif "youtu.be/" in url:
            video_id = url.split("youtu.be/")[-1].split("?")[0]
        elif "embed/" in url:
            return url
        if video_id:
            return f"https://www.youtube.com/embed/{video_id}"
        return url

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "poster_url": self.poster_url,
            "description": self.description,
            "year": self.year,
            "runtime_minutes": self.runtime_minutes,
            "rating": self.rating,
            "genres": self.genre_list(),
            "director": self.director,
            "cast": self.cast_list(),
            "trailer_embed_url": self.trailer_embed_url(),
        }


class Like(db.Model):
    __tablename__ = "likes"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), nullable=False, index=True)
    movie_id = db.Column(db.Integer, db.ForeignKey("movies.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    __table_args__ = (
        db.UniqueConstraint("session_id", "movie_id", name="uq_session_movie"),
    )
