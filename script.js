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
    li.textContent = n;
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

  // 🔥 랜덤 이미지
  if (data.islandImages && data.islandImages.length > 0) {
    const img = data.islandImages[
      Math.floor(Math.random() * data.islandImages.length)
    ];
    document.getElementById("islandImage").src = img;
  }
}

load();
