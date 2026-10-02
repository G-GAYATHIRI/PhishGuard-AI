import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report
)

# Load dataset
data = pd.read_csv("dataset/urls.csv")

X = data["url"]
y = data["label"]

# Convert URLs into numerical features
vectorizer = TfidfVectorizer(
    analyzer="char",
    ngram_range=(2, 5)
)

X_features = vectorizer.fit_transform(X)

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X_features,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# Random Forest Model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)

# Prediction
y_pred = model.predict(X_test)

# Evaluation
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, zero_division=0)
recall = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)

print("\n==============================")
print("     PHISHGUARD AI")
print("   RANDOM FOREST MODEL")
print("==============================")

print(f"Accuracy  : {accuracy * 100:.2f}%")
print(f"Precision : {precision * 100:.2f}%")
print(f"Recall    : {recall * 100:.2f}%")
print(f"F1 Score  : {f1 * 100:.2f}%")

print("\nClassification Report:")
print(classification_report(
    y_test,
    y_pred,
    zero_division=0
))

# Save model
joblib.dump(model, "phishing_model.pkl")
joblib.dump(vectorizer, "url_vectorizer.pkl")

print("==============================")
print("✅ Random Forest model trained!")
print("✅ Model files updated!")
print("==============================")