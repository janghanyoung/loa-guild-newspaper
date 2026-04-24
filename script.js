async function load() {
  const res = await fetch("./daily.json", { cache: "no-store" });
  const data = await res.json();

  document.getElementById("date").textContent = data.date;

  if (data.error) {
    document.getElementById("error").textContent = data.error;
    return;
  }

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

  const islandEl = document.getElementById("islands");
  islandEl.innerHTML = "";
  data.islands.forEach(i => {
    const li = document.createElement("li");
    li.textContent = i;
    islandEl.appendChild(li);
  });

  const eventEl = document.getElementById("events");
  if (eventEl && data.events) {
    eventEl.innerHTML = "";
    data.events.forEach(e => {
      const li = document.createElement("li");
      li.textContent = e;
      eventEl.appendChild(li);
    });
  }

  if (data.youtube) {
    document.getElementById("youtubeFrame").src = data.youtube.playlistUrl;
    document.getElementById("youtubeTitle").textContent = data.youtube.title;
  }

  const adEl = document.getElementById("guildAds") || document.getElementById("guild_ads");
  if (adEl && data.guildAds) {
    adEl.innerHTML = "";

    data.guildAds.forEach(item => {
      const li = document.createElement("li");

      if (typeof item === "object") {
        if (item.title) {
          const title = document.createElement("strong");
          title.textContent = item.title;
          li.appendChild(title);
        }

        if (item.image) {
          const img = document.createElement("img");
          img.src = item.image;
          img.alt = item.title || "길드 광고 이미지";
          li.appendChild(img);
        }

        if (item.text) {
          const p = document.createElement("p");
          p.textContent = item.text;
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

  if (data.islandImages && data.islandImages.length > 0) {
    const img = data.islandImages[Math.floor(Math.random() * data.islandImages.length)];
    document.getElementById("islandImage").src = img;
  }
}

load();
