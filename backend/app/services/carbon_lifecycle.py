DEMO_FACTORS: dict = {
    "lunch_box": {
        "single_use": {
            "raw_material": {"value": 0.09, "label": "原料取得", "note": "PP 塑料原料，Ecoinvent 3.9"},
            "manufacturing": {"value": 0.07, "label": "製造加工", "note": "台灣環保署《一次性塑膠餐具 LCA》2022"},
            "transport": {"value": 0.04, "label": "運輸配送", "note": "GHG Protocol Transport Tool v2"},
            "disposal": {"value": 0.10, "label": "廢棄處理", "note": "IPCC AR6 廢棄物係數（焚化）"},
        },
        "reusable": {
            "production": {"value": 0.030, "label": "製造攤提", "note": "不鏽鋼生產 3.0 kg CO₂e / 100 次壽命攤提"},
            "outbound_transport": {"value": 0.015, "label": "正向配送", "note": "廚房至公司配送"},
            "washing": {"value": 0.025, "label": "清洗消毒", "note": "台灣電力係數 0.495 kWh/kg CO₂e"},
            "reverse_logistics": {"value": 0.025, "label": "逆物流", "note": "回收點至清洗廠運輸"},
            "damage_loss": {"value": 0.020, "label": "損耗攤提", "note": "損耗率 2%，以攤提方式計算"},
        },
    },
    "drink_cup": {
        "single_use": {
            "raw_material": {"value": 0.06, "label": "原料取得", "note": "PS / PE 杯原料"},
            "manufacturing": {"value": 0.04, "label": "製造加工", "note": "Demo 估算"},
            "transport": {"value": 0.02, "label": "運輸配送", "note": "Demo 估算"},
            "disposal": {"value": 0.08, "label": "廢棄處理", "note": "Demo 估算"},
        },
        "reusable": {
            "production": {"value": 0.020, "label": "製造攤提", "note": "PP 循環杯 2.0 kg CO₂e / 100 次"},
            "outbound_transport": {"value": 0.010, "label": "正向配送", "note": "Demo 估算"},
            "washing": {"value": 0.020, "label": "清洗消毒", "note": "Demo 估算"},
            "reverse_logistics": {"value": 0.015, "label": "逆物流", "note": "Demo 估算"},
            "damage_loss": {"value": 0.010, "label": "損耗攤提", "note": "Demo 估算"},
        },
    },
    "delivery_bag": {
        "single_use": {
            "raw_material": {"value": 0.05, "label": "原料取得", "note": "LDPE 袋原料"},
            "manufacturing": {"value": 0.03, "label": "製造加工", "note": "Demo 估算"},
            "transport": {"value": 0.02, "label": "運輸配送", "note": "Demo 估算"},
            "disposal": {"value": 0.06, "label": "廢棄處理", "note": "Demo 估算"},
        },
        "reusable": {
            "production": {"value": 0.015, "label": "製造攤提", "note": "帆布袋 1.5 kg CO₂e / 100 次"},
            "outbound_transport": {"value": 0.008, "label": "正向配送", "note": "Demo 估算"},
            "washing": {"value": 0.012, "label": "清洗消毒", "note": "Demo 估算"},
            "reverse_logistics": {"value": 0.010, "label": "逆物流", "note": "Demo 估算"},
            "damage_loss": {"value": 0.008, "label": "損耗攤提", "note": "Demo 估算"},
        },
    },
}

ITEM_LABELS = {
    "lunch_box": "午餐盒",
    "drink_cup": "飲料杯",
    "delivery_bag": "外送袋",
}

ASSUMPTIONS = [
    "碳係數為 Demo 估算值，正式揭露前應替換為第三方驗證數據。",
    "估算節省量屬 avoided emissions / impact 指標，不直接計入 Scope 1、2、3 清冊總量。",
    "循環容器碳排以預期 100 次壽命攤提生產碳成本計算。",
]


def _build_nodes(stages: dict) -> list:
    total = sum(v["value"] for v in stages.values())
    return [
        {
            "stage": k,
            "label": v["label"],
            "kgCO2e": round(v["value"], 4),
            "pct": round(v["value"] / total * 100, 1) if total > 0 else 0,
            "note": v["note"],
        }
        for k, v in stages.items()
    ]


def get_lifecycle_tree(item_type: str) -> dict:
    factors = DEMO_FACTORS.get(item_type, DEMO_FACTORS["lunch_box"])
    su_stages = factors["single_use"]
    ru_stages = factors["reusable"]

    su_total = sum(v["value"] for v in su_stages.values())
    ru_total = sum(v["value"] for v in ru_stages.values())
    saved = su_total - ru_total

    label = ITEM_LABELS.get(item_type, item_type)
    return {
        "itemType": item_type,
        "comparisonTitle": f"一次性{label} vs 循環{label}",
        "singleUse": {
            "label": f"一次性{label}",
            "totalKgCO2e": round(su_total, 4),
            "nodes": _build_nodes(su_stages),
        },
        "reusable": {
            "label": f"循環{label}",
            "totalKgCO2e": round(ru_total, 4),
            "nodes": _build_nodes(ru_stages),
        },
        "savedKgCO2e": round(saved, 4),
        "confidenceLevel": "low",
        "isDemoEstimate": True,
        "assumptions": ASSUMPTIONS,
    }


def calculate_comparison(item_type: str, quantity: int, return_rate: float) -> dict:
    factors = DEMO_FACTORS.get(item_type, DEMO_FACTORS["lunch_box"])
    su_total = sum(v["value"] for v in factors["single_use"].values())
    ru_total = sum(v["value"] for v in factors["reusable"].values())
    saved_per_item = su_total - ru_total
    successful_count = int(quantity * return_rate)
    total_saved = saved_per_item * successful_count

    tree = get_lifecycle_tree(item_type)
    return {
        "singleUsePerItemKgCO2e": round(su_total, 4),
        "reusablePerCycleKgCO2e": round(ru_total, 4),
        "savedPerItemKgCO2e": round(saved_per_item, 4),
        "estimatedSavedKgCO2e": round(total_saved, 3),
        "quantity": quantity,
        "returnRate": return_rate,
        "successfulReuseCount": successful_count,
        "confidenceLevel": "low",
        "isDemoEstimate": True,
        "singleUseNodes": tree["singleUse"]["nodes"],
        "reusableNodes": tree["reusable"]["nodes"],
        "assumptions": ASSUMPTIONS,
    }


def get_all_factors() -> dict:
    result = {}
    for item_type, modes in DEMO_FACTORS.items():
        result[item_type] = {
            "single_use": {k: v["value"] for k, v in modes["single_use"].items()},
            "reusable": {k: v["value"] for k, v in modes["reusable"].items()},
        }
    return result
