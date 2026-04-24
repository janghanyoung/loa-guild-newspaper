async function load() {
  const res = await fetch("./daily.json");
  const data = await res.json();

  document.getElementById("date").textContent = data.date;

  if (data.error) {
    document.getElementById("error").textContent = data.error;
    return;
  }

  const noticeEl = document.getElementById("notices");
  data.notices.forEach(n => {
    const li = document.createElement("li");
    li.textContent = n;
    noticeEl.appendChild(li);
  });

  const islandEl = document.getElementById("islands");
  data.islands.forEach(i => {
    const li = document.createElement("li");
    li.textContent = i;
    islandEl.appendChild(li);
  });
}

load();
