import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

TIMEZONE = ZoneInfo("Asia/Seoul")

API_CALENDAR = "https://developer-lostark.game.onstove.com/gamecontents/calendar"


def get_api_key():
    key = os.environ.get("LOA_API_KEY", "")
    if not key:
        raise RuntimeError("LOA_API_KEY 없음")
    return key


def fetch_calendar():
    res = requests.get(
        API_CALENDAR,
        headers={"Authorization": f"bearer {get_api_key()}"}
    )

    if res.status_code != 200:
        raise RuntimeError(f"캘린더 실패: {res.status_code}")

    data = res.json()
    today = datetime.now(TIMEZONE).strftime("%Y-%m-%d")

    islands = []
    for item in data:
        times = item.get("StartTimes") or []
        if any(today in t for t in times):
            name = item.get("ContentsName", "")
            if "섬" in name:
                islands.append(name)

    return list(dict.fromkeys(islands))[:6]


def fetch_notices():
    url = "https://m-lostark.game.onstove.com/News/Notice/List"
    res = requests.get(url)

    if res.status_code != 200:
        raise RuntimeError("공지 크롤링 실패")

    soup = BeautifulSoup(res.text, "html.parser")

    titles = []
    for a in soup.select(".list__title"):
        text = a.get_text(strip=True)
        if text:
            titles.append(text)

    return titles[:5]


def build():
    try:
        notices = fetch_notices()
        islands = fetch_calendar()

        return {
            "date": datetime.now(TIMEZONE).strftime("%Y-%m-%d"),
            "notices": notices,
            "islands": islands,
            "error": None
        }

    except Exception as e:
        return {
            "date": "",
            "notices": [],
            "islands": [],
            "error": str(e)
        }


if __name__ == "__main__":
    data = build()

    with open("daily.json", "w", encoding="utf-8") as f:
         json.dump(data, f, ensure_ascii=False, indent=2)
