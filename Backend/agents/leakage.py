import pandas as pd
import numpy as np

class LeakageDetectionAgent:
    """
    Detects and removes potential target leakage features.
    """

    def __init__(self, corr_threshold=0.98):
        self.corr_threshold = corr_threshold
        self.flagged_features = []

    def detect_and_remove(self, X: pd.DataFrame, y: pd.Series):
        X_safe = X.copy()
        self.flagged_features = []

        for col in X_safe.select_dtypes(include=np.number).columns:
            corr = np.corrcoef(X_safe[col], y)[0, 1]
            if abs(corr) > self.corr_threshold:
                self.flagged_features.append(col)

        if self.flagged_features:
            X_safe.drop(columns=self.flagged_features, inplace=True)

        return X_safe