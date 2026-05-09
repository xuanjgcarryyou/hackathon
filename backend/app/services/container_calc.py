DISPOSABLE_CO2E_PER_UNIT = 0.3  # kg CO₂e，台灣環保署一次性餐盒數據


def calc_co2e_saved(collected_count: int, carbon_factor_per_cycle: float) -> float:
    return collected_count * (DISPOSABLE_CO2E_PER_UNIT - carbon_factor_per_cycle)
