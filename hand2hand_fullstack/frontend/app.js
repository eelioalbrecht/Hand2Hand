const API_BASE = (location.hostname === 'localhost') ? 'http://localhost:4000/api' : '/api';
function qs(id){ return document.getElementById(id) }
function jsonFetch(url, method='GET', body=null, token=null){
  const opts = { method, headers: {} }
  if(body && !(body instanceof FormData)) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  else if(body instanceof FormData) opts.body = body
  if(token) opts.headers['Authorization'] = 'Bearer ' + token
  return fetch(url, opts).then(r=>r.json())
}
let mobilenetModel = null;
async function loadMobileNet(){ const el = qs('classifyStatus'); if(!el) return; el.textContent='Loading model...'; try{ mobilenetModel = await mobilenet.load(); el.textContent='Model loaded.' }catch(e){ el.textContent='Model load failed: '+e.message } }
document.addEventListener('DOMContentLoaded', ()=>{
  loadMobileNet();
  bindAuthUI();
  loadFoundersAndNgos();
  bindMainUI();
  refreshNgos();
})
function bindAuthUI(){
  qs('tabUser').onclick = ()=> { qs('userAuth').style.display='block'; qs('ngoAuth').style.display='none' }
  qs('tabNGO').onclick = ()=> { qs('userAuth').style.display='none'; qs('ngoAuth').style.display='block' }
  qs('sendEmailOtpBtn').onclick = async ()=>{
    const email = qs('u_email').value.trim()
    if(!email){ qs('userAuthMsg').textContent = 'Enter email'; return }
    const res = await jsonFetch(`${API_BASE}/auth/send-otp`, 'POST', { email })
    qs('userAuthMsg').textContent = res.message || JSON.stringify(res)
    qs('otpUI').style.display = 'block'
  }
  qs('verifyEmailOtpBtn').onclick = async ()=>{
    const email = qs('u_email').value.trim()
    const code = qs('u_otp').value.trim()
    if(!email||!code){ qs('userAuthMsg').textContent='provide email and otp'; return }
    const res = await jsonFetch(`${API_BASE}/auth/verify-otp`, 'POST', { email, code })
    if(res.ok && res.token){ localStorage.setItem('h2h_token', res.token); qs('userAuthMsg').textContent='Logged in via OTP as '+(res.user?.name||res.user?.email); afterLogin() }
    else qs('userAuthMsg').textContent = res.error || JSON.stringify(res)
  }
  qs('userSignupBtn').onclick = async ()=>{
    const name = qs('u_name').value.trim()
    const email = qs('u_email').value.trim()
    const pass = prompt('Choose a password (for demo)') || ''
    if(!name || !pass){ qs('userAuthMsg').textContent='Provide name and password'; return }
    const res = await jsonFetch(`${API_BASE}/auth/signup`, 'POST', { name, username: name, email, password: pass })
    if(res.ok){ localStorage.setItem('h2h_token', res.token); qs('userAuthMsg').textContent='Signed up & logged in as '+name; afterLogin() }
    else qs('userAuthMsg').textContent = res.error || JSON.stringify(res)
  }
  qs('userLoginBtn').onclick = async ()=>{
    const id = qs('u_login_id').value.trim()
    const pass = qs('u_login_pass').value
    if(!id || !pass){ qs('userAuthMsg').textContent='Provide username/email and password'; return }
    const res = await jsonFetch(`${API_BASE}/auth/login`, 'POST', { usernameOrEmail: id, password: pass })
    if(res.ok && res.token){ localStorage.setItem('h2h_token', res.token); qs('userAuthMsg').textContent='Logged in'; afterLogin() }
    else qs('userAuthMsg').textContent = res.error || JSON.stringify(res)
  }
  qs('userLoginOtpBtn').onclick = async ()=>{
    const email = qs('u_login_id').value.trim()
    if(!email){ qs('userAuthMsg').textContent='Enter username or email'; return }
    const res = await jsonFetch(`${API_BASE}/auth/send-otp`, 'POST', { email })
    qs('userAuthMsg').textContent = res.message || JSON.stringify(res)
    qs('otpUI').style.display = 'block'
    qs('verifyEmailOtpBtn').onclick = async ()=>{
      const code = qs('u_otp').value.trim()
      const r2 = await jsonFetch(`${API_BASE}/auth/verify-otp`, 'POST', { email, code })
      if(r2.ok && r2.token){ localStorage.setItem('h2h_token', r2.token); qs('userAuthMsg').textContent='Logged in via OTP'; afterLogin() }
      else qs('userAuthMsg').textContent = r2.error || JSON.stringify(r2)
    }
  }
  qs('ngoSignupBtn').onclick = async ()=>{
    const name = qs('ngo_name').value.trim(), phone = qs('ngo_phone').value.trim(), code = qs('ngo_code').value.trim(), pass = qs('ngo_pass').value
    if(!name || !pass){ qs('ngoAuthMsg').textContent='Provide name and password'; return }
    const res = await jsonFetch(`${API_BASE}/auth/ngo/signup`, 'POST', { name, phone, code, password: pass })
    if(res.ok){ localStorage.setItem('h2h_token', res.token); qs('ngoAuthMsg').textContent='NGO registered & logged in'; afterLogin() }
    else qs('ngoAuthMsg').textContent = res.error || JSON.stringify(res)
  }
  qs('ngoLoginBtn').onclick = async ()=>{
    const key = qs('ngo_name').value.trim(), pass = qs('ngo_pass').value
    if(!key || !pass){ qs('ngoAuthMsg').textContent='Provide name/code and password'; return }
    const res = await jsonFetch(`${API_BASE}/auth/ngo/login`, 'POST', { nameOrCode: key, password: pass })
    if(res.ok){ localStorage.setItem('h2h_token', res.token); qs('ngoAuthMsg').textContent='NGO logged in'; afterLogin() }
    else qs('ngoAuthMsg').textContent = res.error || JSON.stringify(res)
  }
}
function afterLogin(){
  refreshNgos()
  qs('donationStatus').textContent = 'You are logged in. Create a donation when ready.'
}
function bindMainUI(){
  qs('recommendBtn').onclick = async ()=>{
    const text = qs('donationText').value.trim()
    if(!text){ qs('recommendResults').textContent='Describe your donation.'; return }
    const res = await jsonFetch(`${API_BASE}/ngos`)
    const ngos = res.ngos || []
    const recs = localRecommend(text, ngos)
    const out = qs('recommendResults'); out.innerHTML = ''
    recs.forEach(r=>{
      const div = document.createElement('div'); div.innerHTML = `<strong>${r.ngo.name}</strong> (${r.ngo.code||''}) — ${(r.score||0).toFixed(2)}<div class="small">needs: ${r.ngo.needs}</div>`
      out.appendChild(div)
    })
    const choose = qs('chooseNgo'); choose.innerHTML = '<option value="">Select NGO</option>'
    recs.forEach(r=> { const opt = document.createElement('option'); opt.value = r.ngo._id || r.ngo.id || r.ngo._id; opt.text = r.ngo.name; choose.appendChild(opt) })
  }
  qs('donorImage').addEventListener('change', (ev)=>{
    qs('donorImagePreview').innerHTML = ''
    const f = ev.target.files && ev.target.files[0]; if(!f) return
    const img = document.createElement('img'); img.src = URL.createObjectURL(f); img.onload = ()=> URL.revokeObjectURL(img.src); qs('donorImagePreview').appendChild(img)
    window._h2h_file = f
  })
  qs('autoClassifyBtn').onclick = async ()=>{
    if(!window._h2h_file) { alert('Upload image first'); return }
    if(!mobilenetModel){ alert('model not ready'); return }
    const imgEl = qs('donorImagePreview').querySelector('img')
    const preds = await mobilenetModel.classify(imgEl, 5)
    qs('classifyStatus').innerHTML = preds.slice(0,3).map(p=> `${p.className} — ${(p.probability*100).toFixed(1)}%`).join('<br/>')
    const label = preds[0].className.split(',')[0]
    qs('donationText').value = qs('donationText').value ? qs('donationText').value + ', ' + label : label
  }
  qs('shareLocBtn').onclick = ()=>{
    if(!navigator.geolocation){ alert('no geo'); return }
    navigator.geolocation.getCurrentPosition(pos=>{
      window._h2h_location = [pos.coords.longitude, pos.coords.latitude]
      qs('recommendResults').textContent = `Location captured: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
    }, err=> alert('location error: '+err.message))
  }
  qs('createDonationBtn').onclick = async ()=>{
    const token = localStorage.getItem('h2h_token')
    if(!token){ alert('Login first'); return }
    const item = qs('item_name').value.trim() || qs('donationText').value.trim()
    const condition = qs('item_condition').value.trim()
    const pickup = qs('item_address').value.trim()
    const ngoId = qs('chooseNgo').value
    if(!item || !ngoId){ alert('Item and NGO required'); return }
    const form = new FormData()
    form.append('item', item)
    form.append('condition', condition)
    form.append('pickupAddress', pickup)
    form.append('ngoId', ngoId)
    if(window._h2h_file) form.append('donorImage', window._h2h_file)
    const res = await fetch(`${API_BASE}/donations/create`, { method:'POST', body: form, headers: { 'Authorization': 'Bearer ' + token } })
    const data = await res.json()
    if(data.ok){ qs('donationStatus').textContent = 'Donation created'; qs('item_name').value=''; qs('donationText').value=''; refreshNgos(); }
    else qs('donationStatus').textContent = data.error || JSON.stringify(data)
  }
}
function fileToDataUrl(file){
  return new Promise((res, rej)=>{
    const r = new FileReader()
    r.onload = ()=> res(r.result)
    r.onerror = e=> rej(e)
    r.readAsDataURL(file)
  })
}
function localRecommend(text, ngos){
  function tokenize(s){ return (s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean) }
  const docs = ngos.map(n => tokenize(n.needs || ''))
  const df = {}
  docs.forEach(d => { const seen = new Set(); d.forEach(t=>{ if(!seen.has(t)){ df[t]=(df[t]||0)+1; seen.add(t) } }) })
  const terms = Object.keys(df)
  const corpus = { terms, docs, df }
  function tfidfVector(tokens){
    const tf = {}; tokens.forEach(t=> tf[t] = (tf[t]||0)+1)
    return corpus.terms.map(term => {
      const tfv = tf[term] || 0
      const idf = Math.log((ngos.length + 1)/((corpus.df[term]||0)+1)) + 1
      return tfv * idf
    })
  }
  const tokens = tokenize(text)
  if(!tokens.length) return []
  const qvec = tfidfVector(tokens)
  function dot(a,b){ return a.reduce((s,x,i)=> s + x*(b[i]||0),0) }
  function norm(a){ return Math.sqrt(a.reduce((s,x)=> s + x*x,0)) }
  function cosine(a,b){ const n = norm(a)*norm(b); return n===0?0: dot(a,b)/n }
  const out = ngos.map((ngo,i)=>{ const dvec = tfidfVector(corpus.docs[i]); return { ngo, score: cosine(qvec, dvec) } }).sort((a,b)=> b.score - a.score)
  return out.slice(0,5)
}
async function refreshNgos(){
  const res = await jsonFetch(`${API_BASE}/ngos`)
  const ngos = res.ngos || []
  const nl = qs('ngosList'); nl.innerHTML = ''
  ngos.forEach(n=> { const li = document.createElement('li'); li.textContent = `${n.name} (${n.code||''})`; nl.appendChild(li) })
  const choose = qs('chooseNgo'); choose.innerHTML = '<option value="">Select NGO</option>'
  ngos.forEach(n=> { const opt = document.createElement('option'); opt.value = n._id || n.id || n._id; opt.text = n.name; choose.appendChild(opt) })
  qs('foundersList').innerHTML = ''; ['Satvik','Pranav','Shishir','Sharvil'].forEach(x=>{ const li = document.createElement('li'); li.textContent = x; qs('foundersList').appendChild(li) })
  qs('topDonorsList').innerHTML = ''; [{name:'Arjun',pts:120},{name:'Meera',pts:95}].forEach(d=>{ const li=document.createElement('li'); li.textContent = d.name + ' — ' + d.pts; qs('topDonorsList').appendChild(li) })
}
