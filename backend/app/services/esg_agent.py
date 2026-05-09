import os
import anthropic

SYSTEM_PROMPT = """你是一位專業的企業永續報告撰寫專家，熟悉 GHG Protocol Scope 3 標準。
你的任務是根據提供的真實數據，撰寫符合 GHG Protocol Scope 3 格式的 ESG 報告段落。

重要規則：
1. 只能使用提供的數字，絕對不可自行推算或假設任何數字
2. 必須輸出中文版與英文版各一份，以 [ZH] 和 [EN] 標記分隔
3. 格式：摘要段落（3-5句）+ 數據說明 + 減量成效聲明
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


async def generate_esg_report(data: dict) -> tuple[str, str, list]:
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

請先輸出 [ZH] 中文版，再輸出 [EN] 英文版。"""

    message = await client.messages.create(
        model=model,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = message.content[0].text
    return _parse_response(raw)
