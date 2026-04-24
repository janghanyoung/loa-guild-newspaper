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

    result = []
    for a in soup.select(".list__item")[:5]:
        title = a.select_one(".list__title").text.strip()
        link = "https://m-lostark.game.onstove.com" + a.select_one("a")["href"]
        result.append({"title": title, "url": link})

    return result


def fetch_images():
    path = Path("assets/islands")
    allowed = {".png", ".jpg", ".jpeg", ".webp"}

    return [
        f"assets/islands/{f.name}"
        for f in path.iterdir()
        if f.suffix.lower() in allowed
    ]


def build():
    return {
        "date": datetime.now(TIMEZONE).strftime("%Y-%m-%d"),
        "notices": fetch_notices(),
        "islands": fetch_islands(),
        "events": ["카오스 게이트", "필드보스", "고고학 핫타임"],
        "youtube": {
            "title": "오늘의 공략 재생목록",
            "playlistUrl": "https://www.youtube.com/embed/videoseries?list=PLxxxx"
        },
        "guildAds": [
            "오늘도 대환장 길드원 모집 중",
            "레이드 지각 시 공개 처형",
            "출석률 0%도 환영 (대신 욕은 먹음)"
        ],
        "islandImages": fetch_images(),
        "error": None
    }


if __name__ == "__main__":
    with open("daily.json", "w", encoding="utf-8") as f:
        json.dump(build(), f, ensure_ascii=False, indent=2)
