import pandas as pd
import numpy as np

class PrunerAgent:
    """
    Agent responsible for pruning low-quality features.
    """

    def __init__(self, var_threshold=1e-4, corr_threshold=0.95):
        self.var_threshold = var_threshold
        self.corr_threshold = corr_threshold

    def prune(self, X: pd.DataFrame) -> pd.DataFrame:
        X_pruned = X.copy()

        # 1. Remove low-variance features
        variances = X_pruned.var(numeric_only=True)
        low_var_cols = variances[variances < self.var_threshold].index.tolist()
        X_pruned.drop(columns=low_var_cols, inplace=True, errors="ignore")

        # 2. Remove highly correlated features
        corr = X_pruned.corr(numeric_only=True).abs()
        upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
        high_corr_cols = [
            column for column in upper.columns if any(upper[column] > self.corr_threshold)
        ]
        X_pruned.drop(columns=high_corr_cols, inplace=True, errors="ignore")

        return X_pruned