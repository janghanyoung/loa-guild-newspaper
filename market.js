async function loadMarket() {
  const res = await fetch('./market.json', { cache: 'no-store' });
  const data = await res.json();

  document.getElementById('marketDate').textContent = data.date;

  if (data.error) {
    document.getElementById('marketError').textContent = data.error;
    return;
  }

  const tableBody = document.getElementById('marketTableBody');
  const summary = document.getElementById('marketSummary');

  let currentTab = 'engravings';

  function render() {
    tableBody.innerHTML = '';
    summary.innerHTML = '';

    const items = data[currentTab] || [];

    items.forEach(item => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${item.price}</td>
        <td>${item.lowest}</td>
        <td>${item.delta}</td>
        <td>${item.note || ''}</td>
      `;

      tableBody.appendChild(tr);
    });

    const total = items.length;
    const rising = items.filter(i => i.delta.includes('+')).length;
    const falling = items.filter(i => i.delta.includes('-')).length;

    summary.innerHTML = `
      <div class="summary-box">총 ${total}개</div>
      <div class="summary-box">상승 ${rising}</div>
      <div class="summary-box">하락 ${falling}</div>
    `;
  }

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      render();
    });
  });

  render();
}

loadMarket();
