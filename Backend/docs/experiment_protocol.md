---

# `docs/experiment_protocol.md`

```markdown
# Experimental Protocol — MAFE

## Dataset

Adult Income Dataset (UCI)

## Task

Binary classification of income level.

## Data Handling

- Raw data is never modified
- Preprocessing via sklearn pipelines
- Train-test split: 80/20 stratified

## Baseline

- Logistic Regression
- Standard preprocessing

## Agent Configurations

1. Baseline
2. Transformation Agent
3. Transformation + Interaction
4. - Pruner
5. - Leakage Detection

## Metrics

- Accuracy
- F1 Score
- ROC-AUC

## Validation

- Consistent random seed
- Identical data splits
- Controlled feature budgets

## Logging

- CSV-based result logging
- Saved plots for each experiment
```
