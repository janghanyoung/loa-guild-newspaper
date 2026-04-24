import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

TIMEZONE = ZoneInfo("Asia/Seoul")
API_CALENDAR = "https://developer-lostark.game.onstove.com/gamecontents/calendar"
API_MARKET_ITEMS = "https://developer-lostark.game.onstove.com/markets/items"
NOTICE_URL = "https://m-lostark.game.onstove.com/News/Notice/List"

# 거래소 각인서 카테고리. 공식 API 구조가 바뀌면 GitHub Secret/Variable로 덮어쓸 수 있게 둠.
ENGRAVING_CATEGORY_CODE = int(os.environ.get("LOA_ENGRAVING_CATEGORY_CODE", "40000"))

# 일단 자주 보는 각인서만 감시. 나중에 config.json으로 뺄 수 있음.
ENGRAVING_WATCHLIST = [
    "원한",
    "아드레날린",
    "저주받은 인형",
    "돌격대장",
    "예리한 둔기",
    "타격의 대가",
    "질량 증가",
    "기습의 대가",
    "결투의 대가",
    "안정된 상태",
]


def now_kst() -> datetime:
    return datetime.now(TIMEZONE)


def get_key() -> str:
    key = os.environ.get("LOA_API_KEY", "").strip()
    if not key:
        raise RuntimeError("LOA_API_KEY 없음")
    return key


def headers() -> dict:
    return {
        "accept": "application/json",
        "authorization": f"bearer {get_key()}",
        "content-type": "application/json",
    }


def fetch_json(method: str, url: str, **kwargs):
    response = requests.request(method, url, timeout=20, **kwargs)
    if response.status_code != 200:
        raise RuntimeError(f"API 실패: {url} / HTTP {response.status_code} / {response.text[:300]}")
    return response.json()


def fetch_islands() -> list[str]:
    data = fetch_json("GET", API_CALENDAR, headers=headers())
    today = now_kst().strftime("%Y-%m-%d")

    result = []
    for item in data:
        if any(today in str(t) for t in item.get("StartTimes", [])):
            name = item.get("ContentsName", "")
            if "섬" in name:
                result.append(name)

    return list(dict.fromkeys(result))[:6]


def fetch_notices() -> list[dict]:
    response = requests.get(NOTICE_URL, timeout=20)
    if response.status_code != 200:
        raise RuntimeError(f"공지 크롤링 실패: HTTP {response.status_code}")

    soup = BeautifulSoup(response.text, "html.parser")
    result = []

    for row in soup.select(".list__item")[:5]:
        title_el = row.select_one(".list__title")
        link_el = row.select_one("a")
        if not title_el or not link_el:
            continue

        href = link_el.get("href", "")
        if href.startswith("http"):
            url = href
        else:
            url = "https://m-lostark.game.onstove.com" + href

        result.append({"title": title_el.get_text(strip=True), "url": url})

    return result


def fetch_images() -> list[str]:
    path = Path("assets/islands")
    allowed = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

    if not path.exists():
        return []

    return sorted([
        f"assets/islands/{file.name}"
        for file in path.iterdir()
        if file.is_file() and file.suffix.lower() in allowed
    ])


def extract_market_items(payload):
    if isinstance(payload, dict):
        items = payload.get("Items") or payload.get("items") or []
        return items if isinstance(items, list) else []
    if isinstance(payload, list):
        return payload
    return []


def market_number(value):
    if value is None:
        return None
    try:
        return int(float(str(value).replace(",", "")))
    except ValueError:
        return None


def format_gold(value) -> str:
    number = market_number(value)
    if number is None:
        return "-"
    return f"{number:,}골"


def format_delta(current, yesterday) -> str:
    current_num = market_number(current)
    yesterday_num = market_number(yesterday)
    if current_num is None or yesterday_num is None:
        return "0"
    diff = current_num - yesterday_num
    if diff > 0:
        return f"+{diff:,}"
    if diff < 0:
        return f"{diff:,}"
    return "0"


def search_engraving(keyword: str) -> dict:
    body = {
        "Sort": "CURRENT_MIN_PRICE",
        "CategoryCode": ENGRAVING_CATEGORY_CODE,
        "CharacterClass": "",
        "ItemTier": 0,
        "ItemGrade": "",
        "ItemName": keyword,
        "PageNo": 1,
        "SortCondition": "ASC",
    }

    payload = fetch_json("POST", API_MARKET_ITEMS, headers=headers(), json=body)
    items = extract_market_items(payload)

    if not items:
        return {
            "name": keyword,
            "category": "각인서",
            "price": "-",
            "lowest": "-",
            "delta": "0",
            "note": "검색 결과 없음",
        }

    # 이름에 키워드와 각인서가 같이 있는 품목 우선. 없으면 첫 번째 품목.
    picked = None
    for item in items:
        name = str(item.get("Name", ""))
        if keyword in name and "각인" in name:
            picked = item
            break
    if picked is None:
        picked = items[0]

    current = picked.get("CurrentMinPrice")
    recent = picked.get("RecentPrice")
    yesterday = picked.get("YDayAvgPrice")
    grade = picked.get("Grade") or "각인서"
    bundle_count = picked.get("BundleCount")
    item_name = picked.get("Name") or keyword

    return {
        "name": item_name,
        "category": grade,
        "price": format_gold(recent or current),
        "lowest": format_gold(current),
        "delta": format_delta(recent or current, yesterday),
        "note": f"묶음 {bundle_count}개" if bundle_count else "거래소 기준",
    }


def build_market_payload() -> dict:
    try:
        engravings = [search_engraving(name) for name in ENGRAVING_WATCHLIST]
        return {
            "date": now_kst().strftime("%Y-%m-%d %H:%M"),
            "engravings": engravings,
            "gems": [],
            "materials": [],
            "etc": [],
            "error": None,
        }
    except Exception as error:
        return {
            "date": now_kst().strftime("%Y-%m-%d %H:%M"),
            "engravings": [],
            "gems": [],
            "materials": [],
            "etc": [],
            "error": str(error),
        }


def build_daily_payload() -> dict:
    return {
        "date": now_kst().strftime("%Y-%m-%d"),
        "notices": fetch_notices(),
        "islands": fetch_islands(),
        "events": ["카오스 게이트", "필드보스", "고고학 핫타임"],
        "youtube": {
            "title": "오늘의 공략 재생목록",
            "playlistUrl": "https://www.youtube.com/embed/videoseries?list=PLLeGJe5uPxsoWavCMFR9IlMBAUyP25L_a",
        },
        "guildAds": [
            "오늘도 대환장 길드원 모집 중",
            "레이드 지각 시 공개 처형",
            "출석률 0%도 환영 (대신 욕은 먹음)",
        ],
        "islandImages": fetch_images(),
        "error": None,
    }


def write_json(path: str, data: dict):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    try:
        daily_payload = build_daily_payload()
    except Exception as error:
        daily_payload = {
            "date": now_kst().strftime("%Y-%m-%d"),
            "notices": [],
            "islands": [],
            "events": [],
            "youtube": None,
            "guildAds": [],
            "islandImages": [],
            "error": str(error),
        }

    market_payload = build_market_payload()

    write_json("daily.json", daily_payload)
    write_json("market.json", market_payload)
