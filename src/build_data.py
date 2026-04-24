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

ENGRAVING_CATEGORY_CODE = int(os.environ.get("LOA_ENGRAVING_CATEGORY_CODE", "40000"))

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


def load_guild_ads():
    path = Path("guild_ads.json")
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except:
        return []


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
        raise RuntimeError(f"API 실패: {url} / HTTP {response.status_code}")
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
    soup = BeautifulSoup(response.text, "html.parser")

    result = []
    for row in soup.select(".list__item")[:5]:
        title_el = row.select_one(".list__title")
        link_el = row.select_one("a")
        if not title_el or not link_el:
            continue

        url = "https://m-lostark.game.onstove.com" + link_el.get("href", "")
        result.append({"title": title_el.text.strip(), "url": url})

    return result


def fetch_images() -> list[str]:
    path = Path("assets/islands")
    allowed = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

    return sorted([
        f"assets/islands/{f.name}"
        for f in path.iterdir()
        if f.suffix.lower() in allowed
    ]) if path.exists() else []


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
        "guildAds": load_guild_ads(),
        "islandImages": fetch_images(),
        "error": None,
    }


def build_market_payload() -> dict:
    return {
        "date": now_kst().strftime("%Y-%m-%d %H:%M"),
        "engravings": [],
        "gems": [],
        "materials": [],
        "etc": [],
        "error": None,
    }


def write_json(path: str, data: dict):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    write_json("daily.json", build_daily_payload())
    write_json("market.json", build_market_payload())
