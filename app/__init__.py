import os
from flask import Flask

from .models import db


def create_app(config_object="config.Config"):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_object)

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)

    from .routes.main_routes import main
    from .routes.admin_routes import admin

    app.register_blueprint(main)
    app.register_blueprint(admin, url_prefix="/admin")

    with app.app_context():
        db.create_all()
        _seed_if_empty()

    return app


def _seed_if_empty():
    from .models import Movie

    if Movie.query.count() > 0:
        return

    sample_movies = [
        dict(
            title="Interstellar",
            poster_url="https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
            description="A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
            year=2014, runtime_minutes=169, rating=8.6,
            genres="Sci-Fi, Adventure, Drama",
            director="Christopher Nolan",
            cast="Matthew McConaughey, Anne Hathaway, Jessica Chastain",
            trailer_url="https://www.youtube.com/watch?v=zSWdZVtXT7E",
        ),
        dict(
            title="The Dark Knight",
            poster_url="https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
            description="When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological tests of his ability to fight injustice.",
            year=2008, runtime_minutes=152, rating=9.0,
            genres="Action, Crime, Drama",
            director="Christopher Nolan",
            cast="Christian Bale, Heath Ledger, Aaron Eckhart",
            trailer_url="https://www.youtube.com/watch?v=EXeTwQWrcwY",
        ),
        dict(
            title="Parasite",
            poster_url="https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
            description="Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
            year=2019, runtime_minutes=132, rating=8.5,
            genres="Comedy, Thriller, Drama",
            director="Bong Joon-ho",
            cast="Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong",
            trailer_url="https://www.youtube.com/watch?v=5xH0HfJHsaY",
        ),
        dict(
            title="La La Land",
            poster_url="https://image.tmdb.org/t/p/w780/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
            description="A jazz pianist falls for an aspiring actress in Los Angeles while both pursue their creative dreams.",
            year=2016, runtime_minutes=128, rating=8.0,
            genres="Comedy, Drama, Music, Romance",
            director="Damien Chazelle",
            cast="Ryan Gosling, Emma Stone, John Legend",
            trailer_url="https://www.youtube.com/watch?v=0pdqf4P9MB8",
        ),
        dict(
            title="Mad Max: Fury Road",
            poster_url="https://image.tmdb.org/t/p/w780/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
            description="In a post-apocalyptic wasteland, Max teams up with a rebellious warrior to flee from a tyrannical ruler.",
            year=2015, runtime_minutes=120, rating=8.1,
            genres="Action, Adventure, Sci-Fi",
            director="George Miller",
            cast="Tom Hardy, Charlize Theron, Nicholas Hoult",
            trailer_url="https://www.youtube.com/watch?v=hEJnMQG9ev8",
        ),
        dict(
            title="Coco",
            poster_url="https://image.tmdb.org/t/p/w780/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg",
            description="Aspiring musician Miguel journeys into the Land of the Dead to uncover his family's mysterious history.",
            year=2017, runtime_minutes=105, rating=8.4,
            genres="Animation, Family, Fantasy, Music",
            director="Lee Unkrich",
            cast="Anthony Gonzalez, Gael Garcia Bernal, Benjamin Bratt",
            trailer_url="https://www.youtube.com/watch?v=xlnPHQ3TLX8",
        ),
        dict(
            title="Whiplash",
            poster_url="https://image.tmdb.org/t/p/w780/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
            description="A promising young drummer enrolls at a cutthroat music conservatory where his dreams are mentored by an instructor who will stop at nothing to realize a student's potential.",
            year=2014, runtime_minutes=107, rating=8.5,
            genres="Drama, Music",
            director="Damien Chazelle",
            cast="Miles Teller, J.K. Simmons, Melissa Benoist",
            trailer_url="https://www.youtube.com/watch?v=7d_jQycdQGo",
        ),
        dict(
            title="Get Out",
            poster_url="https://image.tmdb.org/t/p/w780/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg",
            description="A young Black man visits his white girlfriend's family estate, where he discovers a horrifying secret.",
            year=2017, runtime_minutes=104, rating=7.7,
            genres="Horror, Mystery, Thriller",
            director="Jordan Peele",
            cast="Daniel Kaluuya, Allison Williams, Bradley Whitford",
            trailer_url="https://www.youtube.com/watch?v=DzfpyUB60YQ",
        ),
    ]

    for data in sample_movies:
        db.session.add(Movie(**data))
    db.session.commit()
