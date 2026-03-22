# MAFE — Multi-Agent Feature Engineering Framework

MAFE is a **research-oriented multi-agent system (MAS)** that automates
feature engineering for tabular machine learning tasks while ensuring
feature quality, efficiency, and fairness.

This project evaluates how specialized agents can collaboratively
improve model performance over traditional manual feature engineering.

---

## 🔬 Problem Motivation

Feature engineering is:

- time-consuming
- highly heuristic
- prone to target leakage

MAFE addresses this by introducing **autonomous agents** that:

- generate features
- coordinate selection
- prune redundancy
- detect leakage

All improvements are **empirically validated**.

---

## 🧠 System Architecture

MAFE consists of the following agents:

| Agent                   | Responsibility             |
| ----------------------- | -------------------------- |
| Transformation Agent    | Non-linear transformations |
| Interaction Agent       | Feature interactions       |
| Coordinator Agent       | Feature budget enforcement |
| Pruner Agent            | Feature quality control    |
| Leakage Detection Agent | Prevents target leakage    |

Pipeline:

---

## 📊 Experiments

Dataset used:

- Adult Income Dataset (UCI)

Models:

- Logistic Regression (baseline & augmented)

Metrics:

- Accuracy
- F1 Score
- ROC-AUC

Evaluation includes:

- Baseline comparison
- Multi-agent configurations
- Ablation studies
- Feature efficiency analysis

---

## 📈 Results Summary

MAFE consistently improves performance over baseline while:

- controlling feature explosion
- avoiding data leakage
- maintaining interpretability

See `results/plots/` for visualizations.

---

## 🖥️ Interactive Dashboard

A Streamlit dashboard is provided for result exploration:

```bash
streamlit run ui/dashboard.py
```

# PROJECT STRUCTURE :-

MAFE/
├── agents/
├── data/
├── experiments/
├── results/
├── models/
├── ui/
├── docs/
└── README.md

# Reproducibility

All experiments can be reproduced using:

```
-python -m experiments.run_mafe
-python experiments.ablations
```
