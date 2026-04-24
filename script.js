async function load() {
  const res = await fetch("./daily.json", { cache: "no-store" });
  const data = await res.json();

  const dateEl = document.getElementById("date");
  const errorEl = document.getElementById("error");
  const noticeEl = document.getElementById("notices");
  const islandEl = document.getElementById("islands");

  dateEl.textContent = data.date || "날짜 없음";

  if (data.error) {
    errorEl.textContent = data.error;
    errorEl.classList.add("active");
    return;
  }

  noticeEl.innerHTML = "";
  (data.notices || []).forEach((notice) => {
    const li = document.createElement("li");
    li.textContent = notice;
    noticeEl.appendChild(li);
  });

  if (!data.notices || data.notices.length === 0) {
    const li = document.createElement("li");
    li.textContent = "표시할 공지사항이 없습니다.";
    noticeEl.appendChild(li);
  }

  islandEl.innerHTML = "";
  (data.islands || []).forEach((island) => {
    const li = document.createElement("li");
    li.textContent = island;
    islandEl.appendChild(li);
  });

  if (!data.islands || data.islands.length === 0) {
    const li = document.createElement("li");
    li.textContent = "오늘 표시된 모험섬이 없습니다.";
    islandEl.appendChild(li);
  }
}

load();
