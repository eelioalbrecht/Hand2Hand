// app.js
// Mock DB (in-memory)
let currentUser = null; // Tracks the logged-in user
let donations = []; // Mock donations array

const NGOs = [
  { _id: "ngo1", name: "BooksForAll", code: "NGO-BK01", needs: "books, notebooks, stationery, education", lat: 12.9716, lng: 77.5946, flagged: false },
  { _id: "ngo2", name: "WarmClothes NGO", code: "NGO-WC02", needs: "blankets, winter clothes, jackets", lat: 12.9611, lng: 77.6387, flagged: false },
  { _id: "ngo3", name: "FoodRelief", code: "NGO-FR03", needs: "groceries, rice, cooked food, dry rations", lat: 12.9352, lng: 77.6245, flagged: false },
  { _id: "ngo4", name: "AidKids Foundation", code: "NGO-AK04", needs: "school supplies, clothes for children, books", lat: 12.9888, lng: 77.5600, flagged: false },
];

const founders = ["Satvik @satvik", "Pranav @eelioalbrecht", "Shishir @shishirk_2007", "Sharvil @Sharvil07"];
const topDonors = [
  {name: "Arjun", phone: "+91 98xxxx", points: 120},
  {name: "Meera", phone: "+91 96xxxx", points: 95},
  {name: "Ravi", phone: "+91 91xxxx", points: 80}
];

// Simple tokenizer + idf-like scoring for short corpora
function tokenize(s){
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean);
}

function buildCorpus(ngos){
  const docs = ngos.map(n => tokenize(n.needs));
  const df = {};
  docs.forEach(d => {
    const seen = new Set();
    d.forEach(t => {
      if(!seen.has(t)){ df[t] = (df[t] || 0) + 1; seen.add(t); }
    });
  });
  const terms = Object.keys(df);
  return { terms, docs, df };
}

const CORPUS = buildCorpus(NGOs);

function tfidfVector(tokens){
  const tf = {};
  tokens.forEach(t => tf[t] = (tf[t] || 0) + 1);
  const vec = CORPUS.terms.map(term => {
    const tfv = tf[term] || 0;
    const idf = Math.log((NGOs.length + 1) / ((CORPUS.df[term] || 0) + 1)) + 1;
    return tfv * idf;
  });
  return vec;
}

function dot(a,b){ return a.reduce((s,x,i) => s + x * (b[i] || 0), 0); }
function norm(a){ return Math.sqrt(a.reduce((s,x) => s + x * x, 0)); }

function cosineSim(a,b){ const n = norm(a) * norm(b); return n === 0 ? 0 : dot(a,b) / n; }

// Recommendation: take user text, compute tfidf vector and rank NGOs by cosine similarity
function recommendNGOs(text, userLocation = null){
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];
  const qvec = tfidfVector(tokens);
  const scores = NGOs.map((ngo,i) => {
    const docTokens = CORPUS.docs[i];
    const dvec = tfidfVector(docTokens);
    let sim = cosineSim(qvec, dvec);
    // if location present, bias by distance (nearer gets small boost)
    if(userLocation && ngo.lat && ngo.lng){
      const d = distanceKm(userLocation[1], userLocation[0], ngo.lat, ngo.lng);
      const proximityBoost = Math.max(0, 1 - Math.min(d/50, 0.9)); // within 50km is helpful
      sim = sim * 0.75 + proximityBoost * 0.25;
    }
    return { ngo, score: sim };
  });
  scores.sort((a,b) => b.score - a.score);
  return scores.filter(s => s.score > 0).slice(0,5);
}

// Haversine distance
function distanceKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Check and flag NGOs without usage photos
function flagNGOs() {
  NGOs.forEach(ngo => {
    const ngoDonations = donations.filter(d => d.ngoId === ngo._id && !d.usageImage);
    ngo.flagged = ngoDonations.length > 0;
  });
}

// UI wiring
document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('authSection');
  const donationSection = document.getElementById('donationSection');
  const uploadDonationSection = document.getElementById('uploadDonationSection');
  const chatbotSection = document.getElementById('chatbotSection');
  const gpsSection = document.getElementById('gpsSection');
  const donationFlowSection = document.getElementById('donationFlowSection');
  const ngoUsageSection = document.getElementById('ngoUsageSection');
  const allNgosSection = document.getElementById('allNgosSection');
  const donateMoneySection = document.getElementById('donateMoneySection');

  function showLoggedInUI() {
    authSection.style.display = 'none';
    donationSection.style.display = 'block';
    uploadDonationSection.style.display = 'block';
    chatbotSection.style.display = 'block';
    gpsSection.style.display = 'block';
    donationFlowSection.style.display = 'block';
    ngoUsageSection.style.display = currentUser.type === 'ngo' ? 'block' : 'none'; // Show for NGOs only
  }

  // Populate static lists
  const fEl = document.getElementById('foundersList');
  founders.forEach(n => { const li = document.createElement('li'); li.textContent = n; fEl.appendChild(li); });

  const ngosList = document.getElementById('ngosList');
  NGOs.forEach(n => { 
    const li = document.createElement('li'); 
    li.textContent = `${n.name} (${n.code}) - needs: ${n.needs}${n.flagged ? ' (Flagged)' : ''}`; 
    li.style.color = n.flagged ? '#ff6b6b' : 'inherit';
    ngosList.appendChild(li);
  });

  const topList = document.getElementById('topDonorsList');
  topDonors.forEach(d => { const li = document.createElement('li'); li.textContent = `${d.name} — ${d.points} pts`; topList.appendChild(li); });

  // Populate all NGOs page
  function populateAllNgos() {
    const allNgosList = document.getElementById('allNgosList');
    allNgosList.innerHTML = '';
    flagNGOs(); // Update flags
    NGOs.forEach(n => {
      const li = document.createElement('li');
      li.textContent = `${n.name} (${n.code}) - needs: ${n.needs}${n.flagged ? ' (Flagged: Missing usage proof)' : ''}`;
      li.style.color = n.flagged ? '#ff6b6b' : 'inherit';
      allNgosList.appendChild(li);
    });
  }

  // User Auth with OTP
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const otpInput = document.getElementById('otpInput');
  const authStatus = document.getElementById('authStatus');
  let mockOtp = null;

  sendOtpBtn.addEventListener('click', () => {
    const name = document.getElementById('username').value.trim();
    const phone = document.getElementById('userphone').value.trim();
    const address = document.getElementById('useraddress').value.trim();
    const type = document.getElementById('userType')?.value || 'donor'; // Default to donor
    if (!name || !phone || !address) {
      authStatus.textContent = 'Please fill in all details.';
      return;
    }
    // Mock OTP generation
    mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Mock OTP:', mockOtp); // For demo, log to console
    authStatus.textContent = `OTP sent to ${phone}. Check console for mock OTP.`;
    otpInput.style.display = 'block';
    verifyOtpBtn.style.display = 'block';
  });

  verifyOtpBtn.addEventListener('click', () => {
    const enteredOtp = document.getElementById('otp').value.trim();
    if (enteredOtp === mockOtp) {
      const name = document.getElementById('username').value.trim();
      const phone = document.getElementById('userphone').value.trim();
      const address = document.getElementById('useraddress').value.trim();
      const type = document.getElementById('userType')?.value || 'donor';
      currentUser = { name, phone, address, type, id: phone }; // Mock ID
      authStatus.textContent = 'OTP verified. Logged in.';
      showLoggedInUI();
    } else {
      authStatus.textContent = 'Invalid OTP. Try again.';
    }
  });

  // Recommendation Button
  document.getElementById('recommendBtn').addEventListener('click', async () => {
    const text = document.getElementById('donationText').value.trim();
    if(!text){ alert('Please describe what you want to donate'); return; }
    const loc = window._hand2hand_location || null;
    const recs = recommendNGOs(text, loc);
    const out = document.getElementById('recommendResults');
    out.innerHTML = '';
    if(recs.length === 0){
      out.innerHTML = '<div>No direct matches found. Try a short description like "blankets" or "books".</div>';
      return;
    }
    const choose = document.getElementById('chooseNgo');
    choose.innerHTML = '<option value="">Select NGO to claim</option>';
    recs.forEach(r => {
      const el = document.createElement('div');
      el.className = 'recItem';
      el.innerHTML = `<strong>${r.ngo.name}</strong> (${r.ngo.code}) — score: ${r.score.toFixed(2)}<div class="muted small">needs: ${r.ngo.needs}${r.ngo.flagged ? ' (Flagged)' : ''}</div>`;
      out.appendChild(el);
      const opt = document.createElement('option');
      opt.value = r.ngo._id;
      opt.textContent = `${r.ngo.name} — ${r.ngo.code}`;
      choose.appendChild(opt);
    });
  });

  // Chatbot
  const chatbotInput = document.getElementById('chatbotInput');
  const chatbotOutput = document.getElementById('chatbotOutput');
  const chatbotSendBtn = document.getElementById('chatbotSendBtn');

  function addChatbotMessage(text, isUser = false) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.padding = '5px';
    msg.style.marginBottom = '5px';
    msg.style.borderRadius = '5px';
    msg.style.background = isUser ? 'rgba(255,255,255,0.1)' : 'rgba(6,182,212,0.1)';
    msg.style.textAlign = isUser ? 'right' : 'left';
    chatbotOutput.appendChild(msg);
    chatbotOutput.scrollTop = chatbotOutput.scrollHeight;
  }

  chatbotSendBtn.addEventListener('click', () => {
    const text = chatbotInput.value.trim();
    if (!text) return;
    addChatbotMessage(text, true);
    chatbotInput.value = '';
    
    // Improved AI response using recommendation engine
    const recs = recommendNGOs(text);
    let response = "I couldn't find a good match. Try describing items like 'books' or 'clothes'.";
    if (recs.length > 0) {
      response = `Based on your input, I recommend: ${recs[0].ngo.name} (${recs[0].ngo.code}) - they need ${recs[0].ngo.needs}.`;
    }
    setTimeout(() => addChatbotMessage(response, false), 1000);
  });
  
  // Image handling + classification
  let mobilenetModel = null;
  const donorInput = document.getElementById('donorImage');
  const donorPreview = document.getElementById('donorImagePreview');
  const classifyStatus = document.getElementById('classifyStatus');

  async function loadModel(){
    classifyStatus.textContent = 'Loading MobileNet model...';
    try{
      mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 }); // Use MobileNet v2
      classifyStatus.textContent = 'Model loaded. You can upload a photo and click "Auto-classify".';
    }catch(e){
      classifyStatus.textContent = 'Failed to load model. Error: ' + e.message;
    }
  }
  loadModel();

  donorInput.addEventListener('change', (ev) => {
    donorPreview.innerHTML = '';
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    img.width = 224; // Resize for model input
    img.height = 224;
    img.onload = () => URL.revokeObjectURL(img.src);
    donorPreview.appendChild(img);
  });

  document.getElementById('autoClassifyBtn').addEventListener('click', async () => {
    const f = donorInput.files && donorInput.files[0];
    if(!f){ alert('Please upload a donation photo first.'); return; }
    if(!mobilenetModel){ alert('Model still loading or failed.'); return; }
    classifyStatus.textContent = 'Classifying image...';
    const imgEl = donorPreview.querySelector('img');
    try{
      const preds = await mobilenetModel.classify(imgEl, 5);
      // Map predictions to donation categories
      const donationCategories = {
        'book': 'books',
        'notebook': 'books',
        'sweater': 'clothes',
        'jacket': 'clothes',
        'food': 'food',
        'rice': 'food',
        'blanket': 'blankets'
      };
      let label = 'unknown';
      for (const pred of preds) {
        const className = pred.className.split(',')[0].toLowerCase();
        for (const [key, value] of Object.entries(donationCategories)) {
          if (className.includes(key)) {
            label = value;
            break;
          }
        }
        if (label !== 'unknown') break;
      }
      classifyStatus.innerHTML = `Top prediction: ${label}<br/>` + preds.slice(0,3).map(p => `${p.className} — ${(p.probability * 100).toFixed(1)}%`).join('<br/>');
      const donationText = document.getElementById('donationText');
      donationText.value = donationText.value ? donationText.value + ' , ' + label : label;
    }catch(e){
      classifyStatus.textContent = 'Classification failed: ' + e.message;
    }
  });

  // GPS
  document.getElementById('shareLocBtn').addEventListener('click', () => {
    const out = document.getElementById('locResult');
    if(!navigator.geolocation){ out.textContent = 'Geolocation not supported by your browser.'; return; }
    out.textContent = 'Requesting location...';
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      window._hand2hand_location = [lng, lat]; // [lng, lat]
      out.innerHTML = `Got location: lat ${lat.toFixed(4)}, lng ${lng.toFixed(4)} — this will bias recommendations to nearby NGOs.`;
      currentUser.location = [lat, lng];
    }, err => {
      out.textContent = 'Could not get location: ' + err.message;
    });
  });

  // Create donation
  document.getElementById('createDonationBtn').addEventListener('click', () => {
    const ngoId = document.getElementById('chooseNgo').value;
    if(!ngoId){ alert('Select an NGO from recommendations first.'); return; }
    const ngo = NGOs.find(n => n._id === ngoId);
    const donationText = document.getElementById('donationText').value || '(no description)';
    const donorImgFile = donorInput.files && donorInput.files[0];
    const donorImageUrl = donorImgFile ? URL.createObjectURL(donorImgFile) : null;
    const status = document.getElementById('donationStatus');
    const donationId = `donation_${donations.length + 1}`;
    status.innerHTML = `Donation created for <strong>${ngo.name}</strong> with desc: "${donationText}" ${donorImgFile ? 'and an attached photo.' : ''}`;
    // Add to mock DB
    donations.push({
      id: donationId,
      donorId: currentUser.phone,
      ngoId: ngo._id,
      desc: donationText,
      image: donorImageUrl,
      usageImage: null,
      timestamp: new Date().toISOString()
    });
    flagNGOs(); // Update flags after new donation
    // Clear inputs
    document.getElementById('donationText').value = '';
    donorInput.value = '';
    donorPreview.innerHTML = '';
    document.getElementById('chooseNgo').value = '';
  });

  // NGO usage proof handling
  const ngoUsageInput = document.getElementById('ngoUsageImage');
  const ngoUsagePreview = document.getElementById('ngoUsagePreview');
  ngoUsageInput.addEventListener('change', (ev) => {
    ngoUsagePreview.innerHTML = '';
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    img.width = 224;
    img.height = 224;
    img.onload = () => URL.revokeObjectURL(img.src);
    ngoUsagePreview.appendChild(img);
  });

  document.getElementById('submitUsageBtn').addEventListener('click', () => {
    const f = ngoUsageInput.files && ngoUsageInput.files[0];
    const out = document.getElementById('usageStatus');
    if(!f){ out.textContent = 'Please choose an NGO usage image first.'; return; }
    const usageImageUrl = URL.createObjectURL(f);
    // Mock: Assign to the first unmatched donation for this NGO
    const unmatched = donations.find(d => d.ngoId === currentUser.id && !d.usageImage); // Assume currentUser.id is NGO ID
    if (unmatched) {
      unmatched.usageImage = usageImageUrl;
      out.textContent = `Usage proof submitted for donation ${unmatched.id}.`;
      flagNGOs(); // Update flags
      // Clear inputs
      ngoUsageInput.value = '';
      ngoUsagePreview.innerHTML = '';
    } else {
      out.textContent = 'No unmatched donations found.';
    }
  });

  // View All NGOs button
  document.getElementById('viewAllNgosBtn').addEventListener('click', () => {
    populateAllNgos();
    allNgosSection.style.display = 'block';
    document.querySelector('.container').style.display = 'none';
    document.querySelector('.topbar').style.display = 'none';
  });

  // Back from All NGOs
  document.getElementById('backFromNgosBtn').addEventListener('click', () => {
    allNgosSection.style.display = 'none';
    document.querySelector('.container').style.display = 'grid';
    document.querySelector('.topbar').style.display = 'block';
  });

  // Donate Money
  document.getElementById('donateMoneyBtn').addEventListener('click', () => {
    const amount = document.getElementById('donateAmount').value.trim();
    if (!amount || amount <= 0) {
      document.getElementById('donateStatus').textContent = 'Please enter a valid amount.';
      return;
    }
    document.getElementById('donateStatus').textContent = `Mock donation of $${amount} to founders processed.`;
    document.getElementById('donateAmount').value = '';
  });
});