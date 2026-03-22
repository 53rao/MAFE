import pandas as pd
import numpy as np
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data" / "raw"
RESULTS_DIR = BASE_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)

# -----------------------------
# Utility: evaluate model
# -----------------------------
def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    return {
        "accuracy": accuracy_score(y_test, y_pred),
        "f1": f1_score(y_test, y_pred),
        "auc": roc_auc_score(y_test, y_prob)
    }

# -----------------------------
# Dataset : Adult Income
# -----------------------------
def load_adult():
    cols = [
        "age","workclass","fnlwgt","education","education_num",
        "marital_status","occupation","relationship","race","sex",
        "capital_gain","capital_loss","hours_per_week","native_country","income"
    ]

    df = pd.read_csv(
        DATA_DIR / "adult" / "adult.data",
        names=cols,
        na_values=" ?",
        skipinitialspace=True
    )

    df.dropna(inplace=True)
    df["income"] = (df["income"] == ">50K").astype(int)

    X = df.drop("income", axis=1)
    y = df["income"]

    return X, y

# -----------------------------
# Baseline Runner
# -----------------------------
def run_baselines(X, y, dataset_name):
    numeric_features = X.select_dtypes(include=np.number).columns
    categorical_features = X.select_dtypes(exclude=np.number).columns

    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), numeric_features),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
    ])

    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000),
        "RandomForest": RandomForestClassifier(
          n_estimators=50,
          random_state=42,
          n_jobs=-1
)
    }

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    results = []

    for model_name, model in models.items():
        pipe = Pipeline([
            ("preprocess", preprocessor),
            ("model", model)
        ])

        pipe.fit(X_train, y_train)
        metrics = evaluate_model(pipe, X_test, y_test)

        results.append({
            "dataset": dataset_name,
            "model": model_name,
            **metrics
        })

        print(f"{dataset_name} | {model_name} -> {metrics}")

    return results

# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":
    all_results = []

    X_adult, y_adult = load_adult()
    all_results.extend(run_baselines(X_adult, y_adult, "Adult"))


    df_results = pd.DataFrame(all_results)
    df_results.to_csv(RESULTS_DIR / "baselines.csv", index=False)

    print("\nBaseline results saved to results/baselines.csv")