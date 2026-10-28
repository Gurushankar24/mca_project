"""Minimal Flask health endpoint for the ML service scaffold."""

# Import Flask so this service can define a small HTTP application.
from flask import Flask, jsonify

# Create the Flask application that will serve the health endpoint.
app = Flask(__name__)


# Register a GET endpoint so a developer can check that the service is running.
@app.get("/health")
def health():
    # Return the health status as JSON, as specified for this service.
    return jsonify({"status": "ok"})


# Start the development server only when this file is run directly.
if __name__ == "__main__":
    # Listen on all local interfaces at the ML service port from the specification.
    app.run(host="0.0.0.0", port=5001, debug=False)
