import numpy as np
import pandas as pd

class TransformationAgent:
    """
    Agent responsible for proposing numeric feature transformations.
    """

    def __init__(self, max_features_per_col=3):
        self.max_features_per_col = max_features_per_col

    def propose_features(self, X: pd.DataFrame) -> pd.DataFrame:
        numeric_cols = X.select_dtypes(include=np.number).columns
        new_features = {}

        for col in numeric_cols:
            series = X[col]

            # Skip constant or near-constant columns
            if series.nunique() <= 2:
                continue

            # Log transform (safe)
            if (series >= 0).all():
                new_features[f"{col}__log"] = np.log1p(series)

            # Square root (safe)
            if (series >= 0).all():
                new_features[f"{col}__sqrt"] = np.sqrt(series)

            # Z-score normalization
            new_features[f"{col}__zscore"] = (
                (series - series.mean()) / (series.std() + 1e-8)
            )

            # Quantile binning
            try:
                new_features[f"{col}__bin"] = pd.qcut(
                    series, q=5, labels=False, duplicates="drop"
                )
            except Exception:
                pass

        return pd.DataFrame(new_features)