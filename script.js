const SUPABASE_URL = "https://ypijnnljdhkmuqkbhbphw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaWpubGpkaGttdXFrYmhicGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Njg3OTUsImV4cCI6MjA5MjU0NDc5NX0.aUl9UIEG3qzigauBF1Us1IHnFPswbf4In2KM67K2ALg";

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let currentGuildId = "";

function $(id) {
  return document.getElementById(id);
}

function toGuildEmail(id) {
  return `${id.trim().replace(/\s+/g, "_")}@guild.local`;
}

function getGuildIdFromUser(user) {
  return user?.user_metadata?.guild_id || user?.email?.replace("@guild.local", "") || "길드원";
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

  const { data, error } = await supabaseClient
    .from("raids")
    .select("id, name, raid, time, user_id, created_at")
    .order("created_at", { ascending: false });

  const list = $("raidList");
  if (!list) return;

  list.innerHTML = "";

  if (error) {
    const li = document.createElement("li");
    li.className = "raid-error";
    li.textContent = `레이드 목록을 불러오지 못했습니다: ${error.message}`;
    list.appendChild(li);
    return;
  }

  if (!data || data.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "아직 접수된 레이드 신청이 없습니다.";
    list.appendChild(li);
    return;
  }

  data.forEach(item => {
    const li = document.createElement("li");
    li.className = "raid-list-item";
    li.innerHTML = `
      <div>
        <strong>${item.raid}</strong>
        <span>${item.name} · ${item.time}</span>
      </div>
      ${currentUser && currentUser.id === item.user_id ? `<button type="button" data-raid-id="${item.id}">취소</button>` : ""}
    `;
    list.appendChild(li);
  });
}

async function handleLogin(event) {
  event.preventDefault();
  if (!supabaseClient) return setAuthMessage("Supabase 연결 정보가 없습니다.", true);

  const id = $("guildId").value.trim();
  const password = $("guildPassword").value;

  if (!id || !password) return setAuthMessage("아이디와 비밀번호를 입력하세요.", true);

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: toGuildEmail(id),
    password
  });

  if (error) return setAuthMessage(error.message, true);
  updateAuthUI(data.user);
  setAuthMessage("로그인 성공");
  await loadRaids();
}

async function handleSignup() {
  if (!supabaseClient) return setAuthMessage("Supabase 연결 정보가 없습니다.", true);

  const id = $("guildId").value.trim();
  const password = $("guildPassword").value;

  if (!id || !password) return setAuthMessage("아이디와 비밀번호를 입력하세요.", true);

  const { data, error } = await supabaseClient.auth.signUp({
    email: toGuildEmail(id),
    password,
    options: { data: { guild_id: id } }
  });

  if (error) return setAuthMessage(error.message, true);
  updateAuthUI(data.user);
  setAuthMessage("회원가입 완료. 바로 로그인되었습니다.");
  await loadRaids();
}

async function handleLogout() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  updateAuthUI(null);
  setAuthMessage("로그아웃되었습니다.");
  await loadRaids();
}

async function handleRaidSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) return alert("Supabase 연결 정보가 없습니다.");

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return alert("로그인 후 신청할 수 있습니다.");

  const name = $("raidName").value.trim() || getGuildIdFromUser(user);
  const raid = $("raidType").value;
  const time = $("raidTime").value.trim();

  const { error } = await supabaseClient.from("raids").insert({
    name,
    raid,
    time,
    user_id: user.id
  });

  if (error) return alert(`신청 실패: ${error.message}`);

  $("raidType").value = "";
  $("raidTime").value = "";
  await loadRaids();
}

async function handleRaidListClick(event) {
  const button = event.target.closest("button[data-raid-id]");
  if (!button || !supabaseClient) return;

  const { error } = await supabaseClient
    .from("raids")
    .delete()
    .eq("id", button.dataset.raidId);

  if (error) return alert(`취소 실패: ${error.message}`);
  await loadRaids();
}

async function initSupabaseFeatures() {
  if (!supabaseClient) return;

  $("authForm")?.addEventListener("submit", handleLogin);
  $("signupButton")?.addEventListener("click", handleSignup);
  $("logoutButton")?.addEventListener("click", handleLogout);
  $("raidForm")?.addEventListener("submit", handleRaidSubmit);
  $("raidList")?.addEventListener("click", handleRaidListClick);

  const { data: { session } } = await supabaseClient.auth.getSession();
  updateAuthUI(session?.user || null);
  await loadRaids();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    updateAuthUI(session?.user || null);
    await loadRaids();
  });
}

loadDailyData();
initSupabaseFeatures();
