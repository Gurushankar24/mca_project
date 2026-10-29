# Import math so the service can reject numbers such as infinity and NaN.
import math

# Import NumPy to calculate group averages and standard deviations.
import numpy as np

# Import Flask tools to create the web service and return JSON responses.
from flask import Flask, jsonify, request

# Import Isolation Forest, the unsupervised model used to find unusual patterns.
from sklearn.ensemble import IsolationForest

# Create the Flask application that will receive anomaly requests.
app = Flask(__name__)

# Keep the model's input feature names in the exact order required by the specification.
FEATURES = ["avg_checkin_delay", "late_count", "leaves_taken", "weekend_adjacent_leaves", "overtime_hrs", "absent_days"]


# Register a GET endpoint so a developer can confirm that the service is running.
@app.get("/health")
def health():
    # Return the health status as JSON, as specified for this service.
    return jsonify({"status": "ok"})


# Register the POST endpoint that scores the submitted employee feature records.
@app.post("/detect-anomalies")
def detect_anomalies():
    # Read the request body as JSON and reject missing or malformed JSON.
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    # Check that contamination is a real number inside the allowed range.
    contamination = payload.get("contamination")
    if isinstance(contamination, bool) or not isinstance(contamination, (int, float)) or not math.isfinite(contamination) or not 0.01 <= contamination <= 0.3:
        return jsonify({"error": "contamination must be a number between 0.01 and 0.3."}), 400

    # Check that employees is a list containing at least ten records.
    employees = payload.get("employees")
    if not isinstance(employees, list) or len(employees) < 10:
        return jsonify({"error": "employees must be a list with at least 10 records."}), 400

    # Prepare rows of feature numbers and track ids to prevent ambiguous results.
    feature_rows = []
    employee_ids = set()

    # Validate every employee record before passing any values to the model.
    for employee in employees:
        # Require each record to be a JSON object.
        if not isinstance(employee, dict):
            return jsonify({"error": "Each employee must be a JSON object."}), 400

        # Require employee_id to be an integer and unique in this request.
        employee_id = employee.get("employee_id")
        if isinstance(employee_id, bool) or not isinstance(employee_id, int) or employee_id in employee_ids:
            return jsonify({"error": "Each employee_id must be a unique integer."}), 400
        employee_ids.add(employee_id)

        # Require every model feature to be a finite number.
        row = []
        for feature in FEATURES:
            value = employee.get(feature)
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                return jsonify({"error": f"{feature} must be a finite number for every employee."}), 400
            row.append(float(value))

        # Save this validated feature row in the same order as FEATURES.
        feature_rows.append(row)

    # Convert the validated numbers into the matrix format expected by scikit-learn.
    feature_matrix = np.array(feature_rows, dtype=float)

    # Create the Isolation Forest with the requested contamination and fixed repeatable seed.
    model = IsolationForest(n_estimators=200, contamination=float(contamination), random_state=42)

    # Fit the model to all employees and label each employee as normal (1) or unusual (-1).
    labels = model.fit_predict(feature_matrix)

    # Convert the model's decision values into severity where larger means more unusual.
    severities = -model.decision_function(feature_matrix)

    # Calculate each feature's population average for the human-readable reasons.
    group_means = np.mean(feature_matrix, axis=0)

    # Calculate each feature's population standard deviation for z-score comparisons.
    group_stds = np.std(feature_matrix, axis=0, ddof=0)

    # Start an empty list that will hold one result for every employee.
    results = []

    # Build the response record for each employee in the original request order.
    for index, employee in enumerate(employees):
        # Convert the model label into the required true/false anomaly field.
        is_anomaly = bool(labels[index] == -1)

        # Start with no reasons because normal employees have an empty reasons list.
        reasons = []

        # Calculate feature explanations only for records the model flagged as unusual.
        if is_anomaly:
            # Collect features that are more than 1.5 population standard deviations above the group.
            candidates = []
            for feature_index, feature in enumerate(FEATURES):
                # Skip z-score calculation when everyone has the same value for this feature.
                if group_stds[feature_index] == 0:
                    continue

                # Calculate how many population standard deviations this value is above the mean.
                z_score = (feature_matrix[index, feature_index] - group_means[feature_index]) / group_stds[feature_index]

                # Keep only high-side differences above the specification's reason threshold.
                if z_score > 1.5:
                    candidates.append((feature_index, z_score))

            # Keep the two strongest reasons, ordered from highest z-score to lowest.
            candidates.sort(key=lambda candidate: candidate[1], reverse=True)
            for feature_index, z_score in candidates[:2]:
                # Add the feature name, employee value, group mean and z-score to the explanation.
                reasons.append({
                    "feature": FEATURES[feature_index],
                    "value": round(float(feature_matrix[index, feature_index]), 2),
                    "group_mean": round(float(group_means[feature_index]), 2),
                    "z_score": round(float(z_score), 2),
                })

        # Add the employee's id, anomaly flag, severity and explanation list to the output.
        results.append({
            "employee_id": employee["employee_id"],
            "is_anomaly": is_anomaly,
            "severity": round(float(severities[index]), 2),
            "reasons": reasons,
        })

    # Return every scored employee in the required response envelope.
    return jsonify({"results": results})


# Start the development server only when this file is run directly.
if __name__ == "__main__":
    # Listen on all local interfaces at the ML service port from the specification.
    app.run(host="0.0.0.0", port=5001, debug=False)
