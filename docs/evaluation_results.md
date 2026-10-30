# Anomaly Detection Evaluation

Window: 30 days ending 2026-10-30.

| Method | True positives | False positives | False negatives | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Isolation Forest (0.05) | 2 | 1 | 3 | 0.667 | 0.400 | 0.500 |
| Isolation Forest (0.10) | 4 | 1 | 1 | 0.800 | 0.800 | 0.800 |
| Isolation Forest (0.15) | 5 | 2 | 0 | 0.714 | 1.000 | 0.833 |
| Z-score baseline | 5 | 1 | 0 | 0.833 | 1.000 | 0.909 |

Across 44 active analysed employees and 5 labelled injected anomalies, **Z-score baseline** had the highest F1 score (0.909). Precision is the share of flags that match injected anomalies; recall is the share of injected anomalies found. These results describe this synthetic dataset and do not establish that a flag indicates wrongdoing.

## Missed and falsely flagged employees

### Isolation Forest (0.05)

- Missed employees: `Manish Gupta`, `Devika Menon`, `Bhavna Shetty`
- Falsely flagged employees: `Deepa Kulkarni`

### Isolation Forest (0.10)

- Missed employees: `Manish Gupta`
- Falsely flagged employees: `Deepa Kulkarni`

### Isolation Forest (0.15)

- Missed employees: None
- Falsely flagged employees: `Deepa Kulkarni`, `Aditya Joshi`

### Z-score baseline

- Missed employees: None
- Falsely flagged employees: `Deepa Kulkarni`
