import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path

import requests
from bs4 import BeautifulSoup

TIMEZONE = ZoneInfo("Asia/Seoul")
API = "https://developer-lostark.game.onstove.com/gamecontents/calendar"


def get_key():
    k = os.environ.get("LOA_API_KEY", "")
    if not k:
        raise RuntimeError("API KEY 없음")
    return k


def fetch_islands():
    res = requests.get(API, headers={"Authorization": f"bearer {get_key()}"})
    data = res.json()
    today = datetime.now(TIMEZONE).strftime("%Y-%m-%d")

    result = []
    for i in data:
        if any(today in t for t in i.get("StartTimes", [])):
            name = i.get("ContentsName", "")
            if "섬" in name:
                result.append(name)

    return list(dict.fromkeys(result))[:6]


def fetch_notices():
    res = requests.get("https://m-lostark.game.onstove.com/News/Notice/List")
    soup = BeautifulSoup(res.text, "html.parser")

    return [a.text.strip() for a in soup.select(".list__title")][:5]


def fetch_images():
    path = Path("assets/islands")
    return [f"assets/islands/{f.name}" for f in path.iterdir()]


def build():
    try:
        return {
            "date": datetime.now(TIMEZONE).strftime("%Y-%m-%d"),
            "notices": fetch_notices(),
            "islands": fetch_islands(),
            "islandImages": fetch_images(),
            "error": None
        }
    except Exception as e:
        return {
            "date": "",
            "notices": [],
            "islands": [],
            "islandImages": [],
            "error": str(e)
        }


if __name__ == "__main__":
    with open("daily.json", "w", encoding="utf-8") as f:
        json.dump(build(), f, ensure_ascii=False, indent=2)
