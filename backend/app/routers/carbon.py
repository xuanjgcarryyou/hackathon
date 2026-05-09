from fastapi import APIRouter
from pydantic import BaseModel

from app.services.carbon_lifecycle import (
    get_lifecycle_tree,
    calculate_comparison,
    get_all_factors,
    ITEM_LABELS,
    ASSUMPTIONS,
)

router = APIRouter()


class CompareRequest(BaseModel):
    itemType: str = "lunch_box"
    quantity: int = 100
    returnRate: float = 0.93
    reusableCycles: int = 100


@router.get("/carbon/factors")
def list_carbon_factors():
    return {
        "itemTypes": list(ITEM_LABELS.keys()),
        "itemLabels": ITEM_LABELS,
        "factors": get_all_factors(),
        "confidenceLevel": "low",
        "isDemoEstimate": True,
        "sourceNote": (
            "Demo 估算值，來源參考：台灣環保署《一次性塑膠餐具生命週期評估》2022 / Ecoinvent 3.9 / "
            "GHG Protocol Transport Tool v2 / IPCC AR6"
        ),
        "assumptions": ASSUMPTIONS,
    }


@router.post("/carbon/compare")
def compare_carbon(body: CompareRequest):
    return calculate_comparison(
        item_type=body.itemType,
        quantity=body.quantity,
        return_rate=body.returnRate,
    )


@router.get("/carbon/lifecycle-tree")
def lifecycle_tree(item_type: str = "lunch_box"):
    return get_lifecycle_tree(item_type)
