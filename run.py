from dotenv import load_dotenv
load_dotenv()  # reads .env in the project root, if present

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
