import pandas as pd
import numpy as np
from pathlib import Path
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.linear_model import LogisticRegression

from agents.transformer import TransformationAgent
from agents.interaction import InteractionAgent
from agents.coordinator import CoordinatorAgent
from agents.pruner import PrunerAgent
from agents.leakage import LeakageDetectionAgent

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data" / "raw"
RESULTS_DIR = BASE_DIR / "results"
MODELS_DIR = BASE_DIR / "models"

RESULTS_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

# -----------------------------
# Load Adult Dataset
# -----------------------------
def load_adult():
    cols = [
        "age","workclass","fnlwgt","education","education_num",
        "marital_status","occupation","relationship","race","sex",
        "capital_gain","capital_loss","hours_per_week",
        "native_country","income"
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
# Evaluation
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
# Main (MAFE Round-4: Leakage Safe)
# -----------------------------
if __name__ == "__main__":

    X, y = load_adult()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # -----------------------------
    # Baseline
    # -----------------------------
    numeric = X.select_dtypes(include=np.number).columns
    categorical = X.select_dtypes(exclude=np.number).columns

    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), numeric),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical)
    ])

    baseline_model = Pipeline([
        ("prep", preprocessor),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    baseline_model.fit(X_train, y_train)
    base_acc, base_f1, base_auc = evaluate(baseline_model, X_test, y_test)

    # -----------------------------
    # Agents
    # -----------------------------
    t_agent = TransformationAgent()
    i_agent = InteractionAgent()
    coordinator = CoordinatorAgent(max_total_features=60)
    pruner = PrunerAgent()
    leakage_agent = LeakageDetectionAgent()

    # Feature generation
    t_feats = t_agent.propose_features(X_train)
    i_feats = i_agent.propose_features(X_train)

    selected = coordinator.select({
        "TransformationAgent": t_feats,
        "InteractionAgent": i_feats
    })

    X_train_aug = X_train.reset_index(drop=True)
    X_test_aug = X_test.reset_index(drop=True)

    for agent, feats in selected.items():
        X_train_aug = pd.concat([X_train_aug, feats.reset_index(drop=True)], axis=1)

        if agent == "TransformationAgent":
            test_feats = t_agent.propose_features(X_test)
        else:
            test_feats = i_agent.propose_features(X_test)

        X_test_aug = pd.concat([X_test_aug, test_feats.reset_index(drop=True)], axis=1)

    # -----------------------------
    # Pruning
    # -----------------------------
    X_train_pruned = pruner.prune(X_train_aug)
    X_test_pruned = X_test_aug[X_train_pruned.columns]

    # -----------------------------
    # Leakage Detection
    # -----------------------------
    X_train_safe = leakage_agent.detect_and_remove(X_train_pruned, y_train)
    X_test_safe = X_test_pruned[X_train_safe.columns]

    print(
        f"LeakageAgent removed {len(leakage_agent.flagged_features)} features"
    )

    # -----------------------------
    # Train final model
    # -----------------------------
    numeric_final = X_train_safe.select_dtypes(include=np.number).columns
    categorical_final = X_train_safe.select_dtypes(exclude=np.number).columns

    preprocessor_final = ColumnTransformer([
        ("num", StandardScaler(), numeric_final),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_final)
    ])

    final_model = Pipeline([
        ("prep", preprocessor_final),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    final_model.fit(X_train_safe, y_train)
    acc, f1, auc = evaluate(final_model, X_test_safe, y_test)

    joblib.dump(final_model, MODELS_DIR / "mafe_adult_leakage_safe.pkl")

    # -----------------------------
    # Results
    # -----------------------------
    print("\n=== MAFE Round-4 (Leakage-Safe MAS) ===")
    print(f"Baseline   -> acc={base_acc:.4f}, f1={base_f1:.4f}, auc={base_auc:.4f}")
    print(f"With Agents-> acc={acc:.4f}, f1={f1:.4f}, auc={auc:.4f}")

    out = pd.DataFrame([{
        "dataset": "Adult",
        "round": 4,
        "agent": "Transformation+Interaction+Pruner+Leakage",
        "features_added": X_train_safe.shape[1] - X_train.shape[1],
        "accuracy": acc,
        "f1": f1,
        "auc": auc
    }])

    output_path = RESULTS_DIR / "mafe_runs.csv"

    if output_path.exists():
        out.to_csv(output_path, mode="a", header=False, index=False)
    else:
        out.to_csv(output_path, index=False)


# -----------------------------
# API entry point
# -----------------------------
def run_pipeline(df: pd.DataFrame) -> dict:
    df = df.copy()
    df.dropna(inplace=True)
    df["income"] = (df["income"].str.strip() == ">50K").astype(int)

    X = df.drop("income", axis=1)
    y = df["income"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # -----------------------------
    # Baseline
    # -----------------------------
    numeric = X.select_dtypes(include=np.number).columns
    categorical = X.select_dtypes(exclude=np.number).columns

    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), numeric),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical)
    ])

    baseline_model = Pipeline([
        ("prep", preprocessor),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    baseline_model.fit(X_train, y_train)
    base_acc, base_f1, base_auc = evaluate(baseline_model, X_test, y_test)

    # -----------------------------
    # Agents
    # -----------------------------
    t_agent = TransformationAgent()
    i_agent = InteractionAgent()
    coordinator = CoordinatorAgent(max_total_features=60)
    pruner = PrunerAgent()
    leakage_agent = LeakageDetectionAgent()

    # Feature generation
    t_feats = t_agent.propose_features(X_train)
    i_feats = i_agent.propose_features(X_train)

    selected = coordinator.select({
        "TransformationAgent": t_feats,
        "InteractionAgent": i_feats
    })

    X_train_aug = X_train.reset_index(drop=True)
    X_test_aug = X_test.reset_index(drop=True)

    for agent, feats in selected.items():
        X_train_aug = pd.concat([X_train_aug, feats.reset_index(drop=True)], axis=1)

        if agent == "TransformationAgent":
            test_feats = t_agent.propose_features(X_test)
        else:
            test_feats = i_agent.propose_features(X_test)

        X_test_aug = pd.concat([X_test_aug, test_feats.reset_index(drop=True)], axis=1)

    # -----------------------------
    # Pruning
    # -----------------------------
    X_train_pruned = pruner.prune(X_train_aug)
    X_test_pruned = X_test_aug[X_train_pruned.columns]

    # -----------------------------
    # Leakage Detection
    # -----------------------------
    X_train_safe = leakage_agent.detect_and_remove(X_train_pruned, y_train)
    X_test_safe = X_test_pruned[X_train_safe.columns]

    # -----------------------------
    # Train final model
    # -----------------------------
    numeric_final = X_train_safe.select_dtypes(include=np.number).columns
    categorical_final = X_train_safe.select_dtypes(exclude=np.number).columns

    preprocessor_final = ColumnTransformer([
        ("num", StandardScaler(), numeric_final),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_final)
    ])

    final_model = Pipeline([
        ("prep", preprocessor_final),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    final_model.fit(X_train_safe, y_train)
    acc, f1, auc = evaluate(final_model, X_test_safe, y_test)

    # -----------------------------
    # Build feature list for frontend
    # -----------------------------
    original_cols = set(X_train.columns)
    t_feat_cols = set(t_feats.columns)

    new_features = []
    for col in X_train_safe.columns:
        if col not in original_cols:
            new_features.append({
                "name": col,
                "agent": "transformation" if col in t_feat_cols else "interaction"
            })

    # -----------------------------
    # Return structured result
    # -----------------------------
    return {
        "baseline_metrics": {
            "accuracy": round(base_acc, 4),
            "f1":       round(base_f1,  4),
            "roc_auc":  round(base_auc, 4),
        },
        "augmented_metrics": {
            "accuracy": round(acc, 4),
            "f1":       round(f1,  4),
            "roc_auc":  round(auc, 4),
        },
        "features_added": len(new_features),
        "features":       new_features,
        "total_features": X_train_safe.shape[1],
    }