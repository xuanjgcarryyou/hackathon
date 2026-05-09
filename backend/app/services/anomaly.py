ANOMALY_THRESHOLD = 0.9


def check_anomaly(return_rate: float) -> bool:
    return return_rate < ANOMALY_THRESHOLD
