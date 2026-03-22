import streamlit as st
import pandas as pd
from pathlib import Path
from PIL import Image

# -----------------------------
# Page Config
# -----------------------------
st.set_page_config(
    page_title="MAFE Dashboard",
    layout="wide"
)

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parents[1]
RESULTS_DIR = BASE_DIR / "results"
PLOTS_DIR = RESULTS_DIR / "plots"

BASELINES_PATH = RESULTS_DIR / "baselines.csv"
MAFE_PATH = RESULTS_DIR / "mafe_runs.csv"

# -----------------------------
# Title
# -----------------------------
st.title("🔬 MAFE: Multi-Agent Feature Engineering")
st.subheader("A Research-Oriented Dashboard for Automated Feature Engineering")

st.markdown("""
**MAFE** is a modular multi-agent system that automates feature engineering
using specialized agents for transformation, interaction, pruning, and leakage detection.
""")

# -----------------------------
# Load Data
# -----------------------------
df_base = pd.read_csv(BASELINES_PATH)
df_mafe = pd.read_csv(MAFE_PATH)

df_base = df_base[df_base["dataset"] == "Adult"]
df_mafe = df_mafe[df_mafe["dataset"] == "Adult"]

# -----------------------------
# Sidebar
# -----------------------------
st.sidebar.header("Navigation")
section = st.sidebar.radio(
    "Go to",
    ["Overview", "Results Table", "Performance Plots", "Downloads"]
)

# -----------------------------
# Overview
# -----------------------------
if section == "Overview":
    st.markdown("""
    ### 📌 Problem Statement
    Manual feature engineering is time-consuming and error-prone.
    MAFE introduces a **multi-agent system** that autonomously generates,
    evaluates, and refines features while maintaining model integrity.
    """)

    st.markdown("""
    ### 🧠 Agents in MAFE
    - **Transformation Agent**: Non-linear feature transformations
    - **Interaction Agent**: Feature interactions
    - **Coordinator Agent**: Feature budget enforcement
    - **Pruner Agent**: Removes low-quality features
    - **Leakage Detection Agent**: Ensures fairness and reliability
    """)

# -----------------------------
# Results Table
# -----------------------------
elif section == "Results Table":
    st.markdown("### 📊 Experimental Results")
    st.dataframe(df_mafe, use_container_width=True)

# -----------------------------
# Performance Plots
# -----------------------------
elif section == "Performance Plots":
    st.markdown("### 📈 Performance Comparison")

    plot_files = [
        "accuracy_zoomed.png",
        "accuracy_delta.png",
        "f1_comparison.png",
        "auc_comparison.png",
        "feature_efficiency.png"
    ]

    for plot in plot_files:
        plot_path = PLOTS_DIR / plot
        if plot_path.exists():
            st.image(Image.open(plot_path), caption=plot, use_container_width=True)

# -----------------------------
# Downloads
# -----------------------------
elif section == "Downloads":
    st.markdown("### ⬇️ Download Results")

    with open(BASELINES_PATH, "rb") as f:
        st.download_button(
            label="Download Baseline Results CSV",
            data=f,
            file_name="baselines.csv"
        )

    with open(MAFE_PATH, "rb") as f:
        st.download_button(
            label="Download MAFE Results CSV",
            data=f,
            file_name="mafe_runs.csv"
        )