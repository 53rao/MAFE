export type Metrics = {
  accuracy: number;
  f1:       number;
  roc_auc:  number;
};

export type Feature = {
  name:  string;
  agent: "transformation" | "interaction";
};

export type JobResult = {
  baseline_metrics:  Metrics;
  augmented_metrics: Metrics;
  features:          Feature[];
  features_added:    number;
};