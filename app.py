from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import joblib
import os
import re
import sqlite3
import numpy as np

from database import create_database

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = BASE_DIR

FRONTEND_DIR = PROJECT_DIR
DATABASE = os.path.join(BASE_DIR, "phishguard.db")

# Load the trained ML model and URL vectorizer
model = joblib.load(
    os.path.join(BASE_DIR, "phishing_model.pkl")
)

vectorizer = joblib.load(
    os.path.join(BASE_DIR, "url_vectorizer.pkl")
)


# ==========================================
# DATABASE HELPER
# ==========================================
def get_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


# ==========================================
# FRONTEND ROUTES
# ==========================================
@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/style.css")
def style():
    return send_from_directory(FRONTEND_DIR, "style.css")


@app.route("/script.js")
def script():
    return send_from_directory(FRONTEND_DIR, "script.js")


# ==========================================
# URL FEATURE DETECTION
# ==========================================
def detect_url_features(url):
    features = []

    if not url.lower().startswith("https://"):
        features.append("Website is not using HTTPS")

    if re.search(r"\d+\.\d+\.\d+\.\d+", url):
        features.append("URL contains an IP address")

    suspicious_words = [
        "login",
        "verify",
        "password",
        "account",
        "security",
        "update",
        "confirm",
        "payment"
    ]

    for word in suspicious_words:
        if word in url.lower():
            features.append(
                f"Suspicious keyword detected: {word}"
            )

    if len(url) > 75:
        features.append("URL is unusually long")

    if "@" in url:
        features.append("URL contains @ symbol")

    return features


# ==========================================
# CHECK URL
# ==========================================
@app.route("/check-url", methods=["POST"])
def check_url():
    data = request.get_json(silent=True) or {}
    url = str(data.get("url", "")).strip()

    if not url.startswith(("http://", "https://")):
        return jsonify({
            "url": url,
            "result": "Invalid URL",
            "risk_score": 0,
            "risk_level": "Invalid",
            "reasons": ["Please enter a valid URL starting with http:// or https://"],
            "features": []
        }), 400

    try:
        # ML model prediction
        url_features = vectorizer.transform([url])
        prediction = int(model.predict(url_features)[0])

        probabilities = model.predict_proba(url_features)[0]

        # Find the probability belonging to class 1
        class_index = list(model.classes_).index(1)
        risk_score = round(float(probabilities[class_index]) * 100)

        features = detect_url_features(url)

        # Risk categories used by dashboard statistics
        if risk_score < 40:
            risk_level = "Low Risk"
        elif risk_score < 70:
            risk_level = "Suspicious"
        else:
            risk_level = "High Risk"

        if prediction == 1:
            result = "Potential Phishing"
            reasons = [
                "ML model detected phishing-like URL patterns",
                "The URL may contain suspicious patterns",
                "Verify the website before entering personal information"
            ]
        else:
            result = "Low Risk"
            reasons = [
                "ML model detected a legitimate-looking URL",
                "No strong phishing pattern was detected"
            ]

        # Save scan result
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO url_checks
                    (url, result, risk_score, risk_level)
                VALUES (?, ?, ?, ?)
                """,
                (url, result, risk_score, risk_level)
            )

        return jsonify({
            "url": url,
            "result": result,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "reasons": reasons,
            "features": features
        })

    except Exception as error:
        app.logger.exception("URL scan failed")
        return jsonify({
            "error": "URL scan failed",
            "details": str(error)
        }), 500


# ==========================================
# URL HISTORY
# ==========================================
@app.route("/history", methods=["GET"])
def get_history():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT url, result, risk_score, risk_level, checked_at
            FROM url_checks
            ORDER BY id DESC
            LIMIT 10
            """
        ).fetchall()

    history = []

    for row in rows:
        history.append({
            "url": row["url"],
            "result": row["result"],
            "risk_score": row["risk_score"],
            "risk_level": row["risk_level"],
            "date": row["checked_at"]
        })

    return jsonify(history)


# ==========================================
# CLEAR HISTORY
# ==========================================
@app.route("/clear-history", methods=["DELETE"])
def clear_history():
    try:
        with get_connection() as connection:
            connection.execute("DELETE FROM url_checks")

        return jsonify({
            "message": "History cleared successfully"
        })

    except Exception:
        app.logger.exception("Clear history failed")
        return jsonify({
            "error": "Unable to clear history"
        }), 500


# ==========================================
# DASHBOARD STATISTICS
# ==========================================
@app.route("/statistics", methods=["GET"])
def get_statistics():
    try:
        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT
                    COUNT(*) AS total,

                    COALESCE(SUM(
                        CASE
                            WHEN risk_level = 'Low Risk'
                            THEN 1 ELSE 0
                        END
                    ), 0) AS safe,

                    COALESCE(SUM(
                        CASE
                            WHEN risk_level = 'Suspicious'
                            THEN 1 ELSE 0
                        END
                    ), 0) AS suspicious,

                    COALESCE(SUM(
                        CASE
                            WHEN risk_level = 'High Risk'
                            THEN 1 ELSE 0
                        END
                    ), 0) AS phishing

                FROM url_checks
                """
            ).fetchone()

        return jsonify({
            "total": row["total"],
            "safe": row["safe"],
            "suspicious": row["suspicious"],
            "phishing": row["phishing"]
        })

    except Exception:
        app.logger.exception("Statistics request failed")
        return jsonify({
            "error": "Unable to load statistics"
        }), 500


# ==========================================
# FEATURE IMPORTANCE
# ==========================================
@app.route("/feature-importance", methods=["GET"])
def feature_importance():
    try:
        importances = model.feature_importances_
        feature_names = vectorizer.get_feature_names_out()

        indices = np.argsort(importances)[-10:][::-1]

        features = []

        for index in indices:
            features.append({
                "feature": str(feature_names[index]),
                "importance": round(
                    float(importances[index]) * 100,
                    2
                )
            })

        return jsonify({"features": features})

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500


# ==========================================
# INITIALIZE DATABASE
# ==========================================
create_database()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )
