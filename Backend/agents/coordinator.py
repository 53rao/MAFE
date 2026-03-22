class CoordinatorAgent:
    """
    Coordinator agent that selects which agent features to keep
    under a global feature budget.
    """

    def __init__(self, max_total_features=50):
        self.max_total_features = max_total_features

    def select(self, feature_sets: dict) -> dict:
        """
        feature_sets = {
            "TransformationAgent": DataFrame,
            "InteractionAgent": DataFrame
        }
        """
        selected = {}
        remaining = self.max_total_features

        for agent_name, df in feature_sets.items():
            if remaining <= 0:
                break

            keep = min(df.shape[1], remaining)
            selected[agent_name] = df.iloc[:, :keep]
            remaining -= keep

        return selected