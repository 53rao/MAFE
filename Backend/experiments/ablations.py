import pandas as pd
import numpy as np
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.linear_model import LogisticRegression

from agents.transformer import TransformationAgent
from agents.interaction import InteractionAgent

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data" / "raw"
RESULTS_DIR = BASE_DIR / "results"
OUT = RESULTS_DIR / "mafe_runs.csv"

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
    return df.drop("income", axis=1), df["income"]

# -----------------------------
def evaluate(model, X_test, y_test):
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    return (
        accuracy_score(y_test, y_pred),
        f1_score(y_test, y_pred),
        roc_auc_score(y_test, y_prob),
    )

# -----------------------------
def run_experiment(agent_type="none"):
    X, y = load_adult()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Apply agents
    if agent_type == "transform":
        agent = TransformationAgent()
        X_train = pd.concat([X_train, agent.propose_features(X_train)], axis=1)
        X_test = pd.concat([X_test, agent.propose_features(X_test)], axis=1)

    if agent_type == "interaction":
        agent = InteractionAgent()
        X_train = pd.concat([X_train, agent.propose_features(X_train)], axis=1)
        X_test = pd.concat([X_test, agent.propose_features(X_test)], axis=1)

    numeric = X_train.select_dtypes(include=np.number).columns
    categorical = X_train.select_dtypes(exclude=np.number).columns

    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), numeric),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical)
    ])

    model = Pipeline([
        ("prep", preprocessor),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    model.fit(X_train, y_train)
    acc, f1, auc = evaluate(model, X_test, y_test)

    return acc, f1, auc, X_train.shape[1] - X.shape[1]

# -----------------------------
if __name__ == "__main__":
    experiments = {
        "Baseline": "none",
        "TransformationOnly": "transform",
        "InteractionOnly": "interaction"
    }

    rows = []

    for name, agent_type in experiments.items():
        acc, f1, auc, feats = run_experiment(agent_type)
        rows.append({
            "dataset": "Adult",
            "round": "Ablation",
            "agent": name,
            "features_added": feats,
            "accuracy": acc,
            "f1": f1,
            "auc": auc
        })

    df = pd.DataFrame(rows)

    if OUT.exists():
        df.to_csv(OUT, mode="a", header=False, index=False)
    else:
        df.to_csv(OUT, index=False)

    print("\n=== Ablation Study Results ===")
    print(df)