import pandas as pd
import numpy as np
from itertools import combinations

class InteractionAgent:
    """
    Agent that proposes feature interactions (ratios, products, differences).
    """

    def __init__(self, max_pairs=10):
        self.max_pairs = max_pairs

    def propose_features(self, X: pd.DataFrame) -> pd.DataFrame:
        numeric_cols = X.select_dtypes(include=np.number).columns
        new_features = {}

        pairs = list(combinations(numeric_cols, 2))[: self.max_pairs]

        for a, b in pairs:
            a_vals = X[a]
            b_vals = X[b]

            # Product
            new_features[f"{a}__x__{b}"] = a_vals * b_vals

            # Difference
            new_features[f"{a}__minus__{b}"] = a_vals - b_vals

            # Ratio (safe)
            new_features[f"{a}__div__{b}"] = a_vals / (b_vals + 1e-8)

        return pd.DataFrame(new_features)