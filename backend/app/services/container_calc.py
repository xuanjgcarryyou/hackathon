DISPOSABLE_CO2E_PER_UNIT = 0.3  # kg CO₂e，台灣環保署一次性餐盒數據
DISPOSABLE_CO2E_SOURCE = "台灣環保署《一次性塑膠餐具生命週期評估》(2022)"
CIRCULAR_CO2E_SOURCE = "Ecoinvent 3.9 — Reusable container washing cycle, 0.15 kg CO₂e/cycle"


def calc_co2e_saved(collected_count: int, carbon_factor_per_cycle: float) -> float:
    return collected_count * (DISPOSABLE_CO2E_PER_UNIT - carbon_factor_per_cycle)
