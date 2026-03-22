# experiments/config.py

SEED = 42
TEST_SIZE = 0.2

DATASET = "Adult"

# Feature budgets
MAX_TOTAL_FEATURES = 60

# Model params
LOGREG_MAX_ITER = 1000

# Paths (relative to project root)
RAW_DATA_DIR = "data/raw"
PROCESSED_DATA_DIR = "data/processed"
RESULTS_DIR = "results"
MODELS_DIR = "models"