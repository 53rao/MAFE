import pandas as pd
import numpy as np
from pathlib import Path

from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw" / "adult"
PROC_DIR = BASE_DIR / "data" / "processed"
PROC_DIR.mkdir(exist_ok=True)

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
        RAW_DIR / "adult.data",
        names=cols,
        na_values=" ?",
        skipinitialspace=True
    )

    df.dropna(inplace=True)
    df["income"] = (df["income"] == ">50K").astype(int)
    return df

# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":

    df = load_adult()

    # Save clean dataset
    clean_path = PROC_DIR / "adult_clean.csv"
    df.to_csv(clean_path, index=False)
    print(f"Saved clean data -> {clean_path}")

    # Baseline preprocessing
    X = df.drop("income", axis=1)
    y = df["income"]

    numeric = X.select_dtypes(include=np.number).columns
    categorical = X.select_dtypes(exclude=np.number).columns

    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), numeric),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical)
    ])

    X_proc = preprocessor.fit_transform(X)

    feature_names = (
        list(numeric) +
        list(preprocessor.named_transformers_["cat"].get_feature_names_out(categorical))
    )

    df_proc = pd.DataFrame(X_proc, columns=feature_names)
    df_proc["income"] = y.reset_index(drop=True)

    baseline_path = PROC_DIR / "adult_baseline_features.csv"
    df_proc.to_csv(baseline_path, index=False)

    print(f"Saved baseline features -> {baseline_path}")