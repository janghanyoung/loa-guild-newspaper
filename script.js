async function load() {
  const res = await fetch("./daily.json", { cache: "no-store" });
  const data = await res.json();

  document.getElementById("date").textContent = data.date;

  if (data.error) {
    document.getElementById("error").textContent = data.error;
    return;
  }

  // 공지
  const noticeEl = document.getElementById("notices");
  noticeEl.innerHTML = "";
  data.notices.forEach(n => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = n.url;
    a.target = "_blank";
    a.textContent = n.title;
    li.appendChild(a);
    noticeEl.appendChild(li);
  });

  // 섬
  const islandEl = document.getElementById("islands");
  islandEl.innerHTML = "";
  data.islands.forEach(i => {
    const li = document.createElement("li");
    li.textContent = i;
    islandEl.appendChild(li);
  });

  // 이벤트
  const eventEl = document.getElementById("events");
  if (eventEl && data.events) {
    eventEl.innerHTML = "";
    data.events.forEach(e => {
      const li = document.createElement("li");
      li.textContent = e;
      eventEl.appendChild(li);
    });
  }

  // 유튜브
  if (data.youtube) {
    document.getElementById("youtubeFrame").src = data.youtube.playlistUrl;
    document.getElementById("youtubeTitle").textContent = data.youtube.title;
  }

  // 🔥 길드 광고 (확장형)
  const adEl = document.getElementById("guildAds");
  if (adEl && data.guildAds) {
    adEl.innerHTML = "";

    data.guildAds.forEach(item => {
      const li = document.createElement("li");

      // 객체형 지원
      if (typeof item === "object") {
        if (item.title) {
          const title = document.createElement("strong");
          title.textContent = item.title;
          li.appendChild(title);
        }

        if (item.image) {
          const img = document.createElement("img");
          img.src = item.image;
          img.style.width = "100%";
          img.style.margin = "8px 0";
          li.appendChild(img);
        }

        if (item.text) {
          const p = document.createElement("p");
          p.textContent = item.text;
          p.style.whiteSpace = "pre-line";
          li.appendChild(p);
        }

        if (item.url) {
          const a = document.createElement("a");
          a.href = item.url;
          a.target = "_blank";
          a.textContent = "바로가기";
          li.appendChild(a);
        }
      } else {
        li.textContent = item;
      }

      adEl.appendChild(li);
    });
  }

  // 이미지
  if (data.islandImages && data.islandImages.length > 0) {
    const img = data.islandImages[Math.floor(Math.random() * data.islandImages.length)];
    document.getElementById("islandImage").src = img;
  }
}

load();
