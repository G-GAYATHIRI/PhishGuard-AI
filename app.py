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


# ===============================
# PROJECT BASE DIRECTORY
# ===============================

BASE_DIR = os.path.dirname(
        os.path.abspath(__file__)
)


# ===============================
# LOAD ML MODEL
# ===============================

model = joblib.load(
    os.path.join(
        BASE_DIR,
        "phishing_model.pkl"
    )
)


# ===============================
# LOAD URL VECTORIZER
# ===============================

vectorizer = joblib.load(
    os.path.join(
        BASE_DIR,
        "url_vectorizer.pkl"
    )
)


# ===============================
# URL FEATURE DETECTION
# ===============================

def detect_url_features(url):

    features = []


    # HTTPS CHECK
    if not url.startswith("https://"):

        features.append(
            "Website is not using HTTPS"
        )


    # IP ADDRESS CHECK
    if re.search(
        r"\d+\.\d+\.\d+\.\d+",
        url
    ):

        features.append(
            "URL contains an IP address"
        )


    # SUSPICIOUS KEYWORDS
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


    # LONG URL CHECK
    if len(url) > 75:

        features.append(
            "URL is unusually long"
        )


    # @ SYMBOL CHECK
    if "@" in url:

        features.append(
            "URL contains @ symbol"
        )


    return features


# ===============================
# HOME
# ===============================

@app.route("/")
def home():

    return "PhishGuard AI Backend is Running!"


# ===============================
# GET HISTORY
# ===============================

@app.route("/history", methods=["GET"])
def get_history():

    connection = sqlite3.connect(
        "phishguard.db"
    )

    cursor = connection.cursor()


    cursor.execute("""
        SELECT url, result, risk_score, risk_level, checked_at
        FROM url_checks
        ORDER BY id DESC
        LIMIT 10
    """)


    rows = cursor.fetchall()

    connection.close()


    history = []


    for row in rows:

        history.append({

            "url": row[0],

            "result": row[1],

            "risk_score": row[2],

            "risk_level": row[3],

            "date": row[4]

        })


    return jsonify(history)


# ===============================
# CHECK URL
# ===============================

@app.route("/check-url", methods=["POST"])
def check_url():

    data = request.get_json()


    url = data.get(
        "url",
        ""
    ).strip()


    # ===============================
    # VALIDATE URL
    # ===============================

    if not url.startswith(
        ("http://", "https://")
    ):

        return jsonify({

            "url": url,

            "result": "Invalid URL",

            "risk_score": 0,

            "risk_level": "Invalid",

            "reasons": [

                "Please enter a valid website URL"

            ],

            "features": []

        })


    # ===============================
    # ML FEATURE EXTRACTION
    # ===============================

    url_features = vectorizer.transform(
        [url]
    )


    # ===============================
    # ML PREDICTION
    # ===============================

    prediction = model.predict(
        url_features
    )[0]


    probability = model.predict_proba(
        url_features
    )[0][1]


    # ===============================
    # RISK SCORE
    # ===============================

    risk_score = round(
        probability * 100
    )


    # ===============================
    # URL FEATURES
    # ===============================

    features = detect_url_features(
        url
    )


    # ===============================
    # RISK LEVEL
    # ===============================

    if risk_score < 40:

        risk_level = "Low Risk"

    elif risk_score < 70:

        risk_level = "Suspicious"

    else:

        risk_level = "High Risk"


    # ===============================
    # RESULT
    # ===============================

    if prediction == 1:

        result = "Potential Phishing"

        reasons = [

            "ML model detected phishing-like URL patterns",

            "The URL may contain suspicious patterns",

            "Please verify the website before entering personal information"

        ]

    else:

        result = "Low Risk"

        reasons = [

            "ML model detected a legitimate-looking URL",

            "No strong phishing pattern was detected"

        ]


    # ===============================
    # SAVE TO DATABASE
    # ===============================

    connection = sqlite3.connect(
        "phishguard.db"
    )

    cursor = connection.cursor()


    cursor.execute(
        """
        INSERT INTO url_checks
        (url, result, risk_score, risk_level)
        VALUES (?, ?, ?, ?)
        """,

        (

            url,

            result,

            risk_score,

            risk_level

        )
    )


    connection.commit()

    connection.close()


    # ===============================
    # SEND RESULT TO FRONTEND
    # ===============================

    return jsonify({

        "url": url,

        "result": result,

        "risk_score": risk_score,

        "risk_level": risk_level,

        "reasons": reasons,

        "features": features

    })


# ===============================
# CLEAR HISTORY
# ===============================

@app.route("/clear-history", methods=["DELETE"])
def clear_history():

    connection = sqlite3.connect(
        "phishguard.db"
    )

    cursor = connection.cursor()


    cursor.execute(
        "DELETE FROM url_checks"
    )


    connection.commit()

    connection.close()


    return jsonify({

        "message":
        "History cleared successfully"

    })


# ===============================
# STATISTICS
# ===============================
@app.route("/feature-importance", methods=["GET"])
def feature_importance():

    try:

        importances = model.feature_importances_
        feature_names = vectorizer.get_feature_names_out()

        indices = np.argsort(importances)[-10:][::-1]

        features = []

        for index in indices:

            features.append({
                "feature": feature_names[index],
                "importance": round(
                    float(importances[index]) * 100,
                    2
                )
            })

        return jsonify({
            "features": features
        })

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500
@app.route("/statistics", methods=["GET"])
def get_statistics():

    connection = sqlite3.connect(
        "phishguard.db"
    )

    cursor = connection.cursor()

    # Total checks
    cursor.execute("""
        SELECT COUNT(*)
        FROM url_checks
    """)
    total = cursor.fetchone()[0]

    # Safe = Low Risk
    cursor.execute("""
        SELECT COUNT(*)
        FROM url_checks
        WHERE risk_level = 'Low Risk'
    """)
    safe = cursor.fetchone()[0]

    # Suspicious = Suspicious
    cursor.execute("""
        SELECT COUNT(*)
        FROM url_checks
        WHERE risk_level = 'Suspicious'
    """)
    suspicious = cursor.fetchone()[0]

    # Phishing = High Risk
    cursor.execute("""
        SELECT COUNT(*)
        FROM url_checks
        WHERE risk_level = 'High Risk'
    """)
    phishing = cursor.fetchone()[0]

    connection.close()

    return jsonify({
        "total": total,
        "safe": safe,
        "phishing": phishing,
        "suspicious": suspicious
    })




# ===============================
# CREATE DATABASE
# ===============================

create_database()


# ===============================
# RUN FLASK SERVER
# ===============================

if __name__ == "__main__":

    app.run(
        debug=True
    )
