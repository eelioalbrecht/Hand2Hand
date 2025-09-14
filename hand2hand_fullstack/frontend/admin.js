const API_BASE = (location.hostname === 'localhost') ? 'http://localhost:4000/api' : '/api';
function qs(id){ return document.getElementById(id) }
function jsonFetch(url, method='GET', body=null, token=null){
  const opts = { method, headers:{} }
  if(body && !(body instanceof FormData)){ opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(body) }
  else if(body) opts.body=body
  if(token) opts.headers['Authorization'] = 'Bearer '+token
  return fetch(url, opts).then(r=>r.json())
}
qs('adminLoginBtn').onclick = async ()=>{
  const email = qs('adminEmail').value.trim()
  const pass = qs('adminPass').value
  const res = await jsonFetch(`${API_BASE}/admin/login`, 'POST', { email, password: pass })
  if(res.ok){ localStorage.setItem('h2h_admin_token', res.token); qs('adminMsg').textContent = 'Login successful'; qs('adminLoginCard').style.display = 'none'; qs('adminPanel').style.display = 'block'; loadAdminTab('users') }
  else qs('adminMsg').textContent = res.error || 'Login failed'
}
qs('tabUsers').onclick = ()=> loadAdminTab('users')
qs('tabNgos').onclick = ()=> loadAdminTab('ngos')
qs('tabDonations').onclick = ()=> loadAdminTab('donations')
let ngoBarChart, timeLineChart
async function loadAdminTab(tab){
  const token = localStorage.getItem('h2h_admin_token')
  if(!token) return
  let data
  if(tab==='users'){
    data = await jsonFetch(`${API_BASE}/admin/users`,'GET',null,token)
    renderTable('panelContent', data.users, ['name','email','phone','createdAt'])
    qs('charts').style.display = 'none'
  }
  else if(tab==='ngos'){
    data = await jsonFetch(`${API_BASE}/admin/ngos`,'GET',null,token)
    renderTable('panelContent', data.ngos, ['name','code','phone','needs','createdAt'])
    qs('charts').style.display = 'none'
  }
  else if(tab==='donations'){
    data = await jsonFetch(`${API_BASE}/admin/donations`,'GET',null,token)
    renderTable('panelContent', data.donations, ['item','condition','status','createdAt'])
    renderDonationCharts(data.donations)
    qs('charts').style.display = 'block'
  }
}
function renderTable(containerId, rows, cols){
  const el = qs(containerId)
  if(!rows){ el.innerHTML='No data'; return }
  let html = '<table class="adminTable"><tr>' + cols.map(c=>`<th>${c}</th>`).join('') + '</tr>'
  rows.forEach(r=>{ html += '<tr>' + cols.map(c=>`<td>${r[c]||''}</td>`).join('') + '</tr>' })
  html += '</table>'
  el.innerHTML = html
}
qs('downloadCsvBtn').onclick = ()=> {
  const token = localStorage.getItem('h2h_admin_token')
  if(!token) return
  window.open(`${API_BASE}/admin/export/donations?token=${token}`,'_blank')
}
function renderDonationCharts(donations){
  const ngoCounts = {}
  donations.forEach(d=>{ const ngo = d.ngoId?.name || 'Unknown NGO'; ngoCounts[ngo] = (ngoCounts[ngo]||0)+1 })
  const ngoLabels = Object.keys(ngoCounts)
  const ngoVals = Object.values(ngoCounts)
  if(ngoBarChart) ngoBarChart.destroy()
  ngoBarChart = new Chart(qs('ngoBarChart'), { type:'bar', data:{ labels: ngoLabels, datasets:[{ label:'Donations per NGO', data: ngoVals }] }, options:{ responsive:true, plugins:{ legend:{ display:false } } } })
  const dailyCounts = {}
  donations.forEach(d=>{ const day = new Date(d.createdAt).toISOString().slice(0,10); dailyCounts[day] = (dailyCounts[day]||0)+1 })
  const timeLabels = Object.keys(dailyCounts).sort()
  const timeVals = timeLabels.map(k=> dailyCounts[k])
  if(timeLineChart) timeLineChart.destroy()
  timeLineChart = new Chart(qs('timeLineChart'), { type:'line', data:{ labels: timeLabels, datasets:[{ label:'Donations per Day', data: timeVals, fill:false }] }, options:{ responsive:true, scales:{ x:{ title:{ display:true,text:'Date'} }, y:{ beginAtZero:true } } } })
}
