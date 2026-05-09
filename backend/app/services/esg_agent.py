import os
import anthropic

SYSTEM_PROMPT = """你是一位專業的企業永續報告撰寫專家，熟悉 GHG Protocol Scope 3 標準。
你的任務是根據提供的真實數據，撰寫符合 GHG Protocol Scope 3 Category 1（採購商品與服務）框架的 ESG 報告段落，
揭露企業透過循環容器採購方案所達成之包材碳排避免量（Avoided Emissions）。

重要規則：
1. 只能使用提供的數字，絕對不可自行推算或假設任何數字
2. 必須輸出中文版與英文版各一份，以 [ZH] 和 [EN] 標記分隔
3. 格式：摘要段落（3-5句）+ 數據說明 + 避免排放量聲明（需說明這是 Avoided Emissions，非 GHG 清冊總量）
4. 語氣專業，符合正式 ESG 報告風格"""


def _parse_response(text: str):
    zh_start = text.find("[ZH]")
    en_start = text.find("[EN]")

    if zh_start == -1 or en_start == -1:
        return text, text, []

    if zh_start < en_start:
        zh_text = text[zh_start + 4:en_start].strip()
        en_text = text[en_start + 4:].strip()
    else:
        en_text = text[en_start + 4:zh_start].strip()
        zh_text = text[zh_start + 4:].strip()

    tables = [
        {
            "title": "循環容器使用數據摘要",
            "headers": ["指標", "數值"],
            "rows": [],  # 由 esg.py 呼叫端填入真實數字
        }
    ]
    return zh_text, en_text, tables


def _mock_report(data: dict) -> tuple[str, str, list]:
    r = data['return_rate']
    source = data.get('carbon_factor_source', '')
    zh = f"""本報告依據 GHG Protocol Scope 3 Category 1（採購商品與服務）框架，揭露企業透過循環容器採購方案減少一次性包材採購所達成之包材碳排避免量（Avoided Emissions）。本揭露範圍為 Category 1 包材上游避免排放量，不涵蓋其他 Scope 3 類別（如運輸 Cat.4、廢棄物 Cat.5 等）；避免量為獨立揭露指標，不直接計入 GHG 清冊排放總量。

報告期間 {data['period_start']} 至 {data['period_end']}，本公司透過循環午餐平台合作餐廳共完成 {data['total_meals']} 份餐點訂購，其中 {data['circular_meals']} 份採用環保服務商「{data['vendor_name']}」提供之循環容器，循環使用率達 {r:.1%}。

相較於傳統一次性包材基線，本期循環方案合計減少 {data['reduced_packaging_kg']:.1f} kg 一次性塑膠包材使用，依據碳因子 {data['carbon_factor']} kg CO₂e／循環次計算，本期包材碳排避免量共達 {data['co2e_saved']:.2f} kg CO₂e。

碳因子來源：{source}。本數據可透過報告末附之資料稽核碼進行追溯驗證。"""

    en = f"""This report is prepared in accordance with the GHG Protocol Scope 3, Category 1 (Purchased Goods and Services) framework, disclosing avoided emissions achieved by substituting single-use packaging with reusable containers in company meal procurement. This disclosure covers Category 1 upstream packaging avoided emissions only; it does not include other Scope 3 categories (e.g., Cat.4 transportation, Cat.5 waste). Avoided emissions are reported as a supplementary indicator and are not added to the GHG inventory total.

During the reporting period from {data['period_start']} to {data['period_end']}, the company facilitated {data['total_meals']} meal orders through the Circular Lunch Platform. Of these, {data['circular_meals']} meals utilized reusable containers provided by eco-partner "{data['vendor_name']}", achieving a circular usage rate of {r:.1%}.

Compared to a single-use packaging baseline, this initiative avoided {data['reduced_packaging_kg']:.1f} kg of disposable plastic materials. Based on an emission factor of {data['carbon_factor']} kg CO₂e per circulation cycle, total packaging avoided emissions for the period amounted to {data['co2e_saved']:.2f} kg CO₂e.

Emission factor sources: {source}. All figures are traceable via the data audit hash appended to this report."""

    tables = [{"title": "循環容器使用數據摘要", "headers": ["指標", "數值"], "rows": []}]
    return zh, en, tables


async def generate_esg_report(data: dict) -> tuple[str, str, list, bool]:
    api_key = os.getenv("CLAUDE_API_KEY")
    model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")

    client = anthropic.AsyncAnthropic(api_key=api_key)

    user_prompt = f"""請根據以下真實數據生成 ESG 報告段落：

報告期間：{data['period_start']} 至 {data['period_end']}
總訂餐份數：{data['total_meals']} 份
使用循環容器份數：{data['circular_meals']} 份
循環率：{data['return_rate']:.1%}
避免一次性包材重量：{data['reduced_packaging_kg']:.1f} kg
CO₂e 減量：{data['co2e_saved']:.2f} kg
使用環保服務商：{data['vendor_name']}（碳因子：{data['carbon_factor']} kg CO₂e / 循環次）
碳因子來源：{data.get('carbon_factor_source', '')}

注意：
- 揭露框架為 GHG Protocol Scope 3 Category 1（採購商品與服務）；核心指標為包材碳排避免量（Avoided Emissions），須明確說明此為補充揭露指標，不計入 GHG 清冊排放總量，且不涵蓋其他 Scope 3 類別
- 碳因子來源需在報告中引用
- 最後一段說明數據可透過稽核碼追溯

請先輸出 [ZH] 中文版，再輸出 [EN] 英文版。"""

    try:
        message = await client.messages.create(
            model=model,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = message.content[0].text
        zh, en, tables = _parse_response(raw)
        return zh, en, tables, False
    except Exception:
        zh, en, tables = _mock_report(data)
        return zh, en, tables, True
