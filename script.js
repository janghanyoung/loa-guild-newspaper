const SUPABASE_URL = "https://ypijnnljdhkmuqkbhbphw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaWpubGpkaGttdXFrYmhicGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Njg3OTUsImV4cCI6MjA5MjU0NDc5NX0.aUl9UIEG3qzigauBF1Us1IHnFPswbf4In2KM67K2ALg";

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let currentGuildId = "";

const SUPPORT_CLASSES = ["바드", "홀리나이트", "도화가"];

function $(id) {
  return document.getElementById(id);
}

function toGuildEmail(id) {
  return `${id.trim().replace(/\s+/g, "_")}@guild.local`;
}

function getGuildIdFromUser(user) {
  return user?.user_metadata?.guild_id || user?.email?.replace("@guild.local", "") || "길드원";
}

function getRole(className) {
  return SUPPORT_CLASSES.includes(className) ? "서폿" : "딜러";
}

function setAuthMessage(message, isError = false) {
  const el = $("authMessage");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("is-error", isError);
}

function updateAuthUI(user) {
  currentUser = user;
  currentGuildId = getGuildIdFromUser(user);

  const isLoggedIn = Boolean(user);
  const userChip = $("userChip");
  const profileName = $("profileName");
  const profileStatus = $("profileStatus");
  const raidBadge = $("raidModeBadge");
  const loginPanel = $("loginPanel");
  const logoutButton = $("logoutButton");
  const raidName = $("raidName");

  if (userChip) userChip.textContent = isLoggedIn ? `👤 ${currentGuildId}` : "👤 로그아웃";
  if (profileName) profileName.textContent = isLoggedIn ? currentGuildId : "로그아웃";
  if (profileStatus) profileStatus.textContent = isLoggedIn ? "인증 완료" : "인증 필요";
  if (raidBadge) raidBadge.textContent = isLoggedIn ? "실시간 접수함" : "로그인 필요";
  if (loginPanel) loginPanel.style.display = isLoggedIn ? "none" : "block";
  if (logoutButton) logoutButton.style.display = isLoggedIn ? "inline-flex" : "none";
  if (raidName && isLoggedIn) raidName.value = currentGuildId;
}

async function loadDailyData() {
  const res = await fetch("./daily.json", { cache: "no-store" });
  const data = await res.json();

  $("date").textContent = data.date;

  if (data.error) {
    $("error").textContent = data.error;
    return;
  }

  const noticeEl = $("notices");
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

  const islandEl = $("islands");
  islandEl.innerHTML = "";
  data.islands.forEach(i => {
    const li = document.createElement("li");
    li.textContent = i;
    islandEl.appendChild(li);
  });

  const eventEl = $("events");
  if (eventEl && data.events) {
    eventEl.innerHTML = "";
    data.events.forEach(e => {
      const li = document.createElement("li");
      li.textContent = e;
      eventEl.appendChild(li);
    });
  }

  if (data.youtube) {
    $("youtubeFrame").src = data.youtube.playlistUrl;
    $("youtubeTitle").textContent = data.youtube.title;
  }

  const adEl = $("guildAds") || $("guild_ads");
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
    $("islandImage").src = img;
  }
}

async function loadRaids() {
  if (!supabaseClient) return;

  const { data } = await supabaseClient
    .from("raids")
    .select("*")
    .order("created_at", { ascending: false });

  const list = $("raidList");
  list.innerHTML = "";

  data?.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${item.raid}</strong>
        <span>${item.name} (${item.class_name} / ${item.role}) · ${item.time}</span>
      </div>
      ${currentUser && currentUser.id === item.user_id ? `<button data-raid-id="${item.id}">취소</button>` : ""}
    `;
    list.appendChild(li);
  });
}

async function handleRaidSubmit(e) {
  e.preventDefault();

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return alert("로그인 필요");

  const className = $("raidClass").value;
  const role = getRole(className);

  await supabaseClient.from("raids").insert({
    name: $("raidName").value,
    raid: $("raidType").value,
    time: $("raidTime").value,
    class_name: className,
    role: role,
    user_id: user.id
  });

  loadRaids();
}

$("raidForm")?.addEventListener("submit", handleRaidSubmit);

loadDailyData();
loadRaids();
