// Mock DB

let currentUser = null;
let users = [];
let donations = [];
let NGOs = [
  { _id: "ngo1", name: "BooksForAll", code: "NGO-BK01", needs: "books, notebooks, stationery, education", lat: 12.9716, lng: 77.5946, flagged: false, description: "Providing educational materials to underprivileged children" },
  { _id: "ngo2", name: "WarmClothes NGO", code: "NGO-WC02", needs: "blankets, winter clothes, jackets", lat: 12.9611, lng: 77.6387, flagged: false, description: "Distributing warm clothing to the needy" },
  { _id: "ngo3", name: "FoodRelief", code: "NGO-FR03", needs: "groceries, rice, cooked food, dry rations", lat: 12.9352, lng: 77.6245, flagged: false, description: "Fighting hunger through food distribution" },
  { _id: "ngo4", name: "AidKids Foundation", code: "NGO-AK04", needs: "school supplies, clothes for children, books", lat: 12.9888, lng: 77.5600, flagged: false, description: "Supporting children's education and welfare" },
];

// AI Recommendation Engine

function tokenize(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
}

function buildCorpus(ngos) {
  const docs = ngos.map(n => tokenize(n.needs));
  const df = {};
  docs.forEach(d => {
    const seen = new Set();
    d.forEach(t => {
      if (!seen.has(t)) { df[t] = (df[t] || 0) + 1; seen.add(t); }
    });
  });
  return { terms: Object.keys(df), docs, df };
}

const CORPUS = buildCorpus(NGOs);

function tfidfVector(tokens) {
  const tf = {};
  tokens.forEach(t => tf[t] = (tf[t] || 0) + 1);
  return CORPUS.terms.map(term => {
    const tfv = tf[term] || 0;
    const idf = Math.log((NGOs.length + 1) / ((CORPUS.df[term] || 0) + 1)) + 1;
    return tfv * idf;
  });
}

function dot(a, b) {
  return a.reduce((s, x, i) => s + x * (b[i] || 0), 0);
}
function norm(a) {
  return Math.sqrt(a.reduce((s, x) => s + x * x, 0));
}
function cosineSim(a, b) {
  const n = norm(a) * norm(b);
  return n === 0 ? 0 : dot(a, b) / n;
}

function recommendNGOs(text, userLocation = null) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];
  const qvec = tfidfVector(tokens);

  const scores = NGOs.map((ngo, i) => {
    const docTokens = CORPUS.docs[i];
    const dvec = tfidfVector(docTokens);
    let sim = cosineSim(qvec, dvec);
    if (userLocation && ngo.lat && ngo.lng) {
      const d = distanceKm(userLocation[1], userLocation, ngo.lat, ngo.lng);
      const proximityBoost = Math.max(0, 1 - Math.min(d / 50, 0.9));
      sim = sim * 0.75 + proximityBoost * 0.25;
    }
    return { ngo, score: sim };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores.filter(s => s.score > 0).slice(0, 5);
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Flag NGOs for missing usage photos
function flagNGOs() {
  NGOs.forEach(ngo => {
    const ngoDonations = donations.filter(d => d.ngoId === ngo._id && !d.usageImage);
    ngo.flagged = ngoDonations.length > 0;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Page elements
  const landingPage = document.getElementById('landing-page');
  const donorDashboard = document.getElementById('donor-dashboard');
  const ngoDashboard = document.getElementById('ngo-dashboard');
  const loginModal = document.getElementById('login-modal');
  const signupModal = document.getElementById('signup-modal');
  const chatbotModal = document.getElementById('chatbot-modal');

  function showPage(page) {
    landingPage.classList.add('hidden');
    donorDashboard.classList.add('hidden');
    ngoDashboard.classList.add('hidden');
    page.classList.remove('hidden');
  }

  // Login
  let loginOtp = null;
  document.getElementById('login-btn').addEventListener('click', () => {
    loginModal.classList.remove('hidden');
    document.getElementById('login-phone').value = '';
    document.getElementById('otp-section').classList.add('hidden');
    document.getElementById('login-status').textContent = '';
  });

  document.getElementById('send-login-otp-btn').addEventListener('click', () => {
    const phone = document.getElementById('login-phone').value.trim();
    if (!phone.match(/^\+\d{10,12}$/)) {
      document.getElementById('login-status').textContent = 'Please enter a valid phone number (e.g., +919876543210).';
      return;
    }
    loginOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Mock Login OTP:', loginOtp);
    document.getElementById('login-status').textContent = `OTP sent to ${phone}. Check console for mock OTP.`;
    document.getElementById('otp-section').classList.remove('hidden');
  });

  document.getElementById('verify-login-otp-btn').addEventListener('click', () => {
    const otp = document.getElementById('login-otp').value.trim();
    const phone = document.getElementById('login-phone').value.trim();
    if (otp === loginOtp) {
      const user = users.find(u => u.phone === phone);
      if (user) {
        currentUser = user;
        loginModal.classList.add('hidden');
        showPage(user.type === 'donor' ? donorDashboard : ngoDashboard);
        document.getElementById('donor-welcome').textContent = `Welcome, ${user.name}!`;
        document.getElementById('ngo-welcome').textContent = `${user.name} | Code: ${user.code || ''}`;
        if (user.type === 'ngo') {
          document.getElementById('ngo-needs').value = NGOs.find(n => n._id === user.code)?.needs || '';
          populateAvailableDonations();
        }
        if (user.type === 'donor') populateDonorItems();
      } else {
        document.getElementById('login-status').textContent = 'User not found. Please sign up.';
      }
    } else {
      document.getElementById('login-status').textContent = 'Invalid OTP.';
    }
  });

  document.getElementById('cancel-login-btn').addEventListener('click', () => {
    loginModal.classList.add('hidden');
  });

  // Signup
  let signupOtp = null;
  document.getElementById('signup-btn').addEventListener('click', () => {
    signupModal.classList.remove('hidden');
    document.getElementById('signup-name').value = '';
    document.getElementById('signup-phone').value = '';
    document.getElementById('signup-address').value = '';
    document.getElementById('ngo-reg-number').value = '';
    document.getElementById('ngo-description').value = '';
    document.getElementById('account-type').value = '';
    document.getElementById('signup-otp-section').classList.add('hidden');
    document.getElementById('signup-status').textContent = '';
    document.getElementById('ngo-fields').classList.add('hidden');
  });

  document.getElementById('account-type').addEventListener('change', (e) => {
    document.getElementById('ngo-fields').classList.toggle('hidden', e.target.value !== 'ngo');
  });

  document.getElementById('send-signup-otp-btn').addEventListener('click', () => {
    const type = document.getElementById('account-type').value;
    const name = document.getElementById('signup-name').value.trim();
    const phone = document.getElementById('signup-phone').value.trim();
    const address = document.getElementById('signup-address').value.trim();
    const regNumber = document.getElementById('ngo-reg-number').value.trim();
    const description = document.getElementById('ngo-description').value.trim();
    if (!type || !name || !phone.match(/^\+\d{10,12}$/) || !address) {
      document.getElementById('signup-status').textContent = 'Please fill in all required fields.';
      return;
    }
    if (type === 'ngo' && (!regNumber || !description)) {
      document.getElementById('signup-status').textContent = 'NGO registration number and description are required.';
      return;
    }
    signupOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Mock Signup OTP:', signupOtp);
    document.getElementById('signup-status').textContent = `OTP sent to ${phone}. Check console for mock OTP.`;
    document.getElementById('signup-otp-section').classList.remove('hidden');
  });

  document.getElementById('verify-signup-otp-btn').addEventListener('click', () => {
    const otp = document.getElementById('signup-otp').value.trim();
    if (otp === signupOtp) {
      const type = document.getElementById('account-type').value;
      const name = document.getElementById('signup-name').value.trim();
      const phone = document.getElementById('signup-phone').value.trim();
      const address = document.getElementById('signup-address').value.trim();
      const regNumber = document.getElementById('ngo-reg-number').value.trim();
      const description = document.getElementById('ngo-description').value.trim();
      const code = type === 'ngo' ? `NGO-${Math.random().toString(36).substr(2, 4).toUpperCase()}` : '';
      currentUser = { type, name, phone, address, code, regNumber, description, id: phone };
      users.push(currentUser);
      if (type === 'ngo') {
        NGOs.push({ _id: code, name, code, needs: description, lat: null, lng: null, flagged: false, description });
        currentUser.ngoId = code;
      }
      signupModal.classList.add('hidden');
      showPage(type === 'donor' ? donorDashboard : ngoDashboard);
      document.getElementById('donor-welcome').textContent = `Welcome, ${name}!`;
      document.getElementById('ngo-welcome').textContent = `${name} | Code: ${code}`;
      if (type === 'ngo') {
        document.getElementById('ngo-needs').value = description;
        populateAvailableDonations();
      }
    } else {
      document.getElementById('signup-status').textContent = 'Invalid OTP.';
    }
  });

  document.getElementById('cancel-signup-btn').addEventListener('click', () => {
    signupModal.classList.add('hidden');
  });

  // Start Donating / Register NGO
  document.getElementById('start-donating-btn').addEventListener('click', () => {
    if (currentUser && currentUser.type === 'donor') {
      showPage(donorDashboard);
      document.getElementById('donor-welcome').textContent = `Welcome, ${currentUser.name}!`;
      populateDonorItems();
    } else {
      signupModal.classList.remove('hidden');
      document.getElementById('account-type').value = 'donor';
      document.getElementById('ngo-fields').classList.add('hidden');
    }
  });

  document.getElementById('register-ngo-btn').addEventListener('click', () => {
    if (currentUser && currentUser.type === 'ngo') {
      showPage(ngoDashboard);
      document.getElementById('ngo-welcome').textContent = `${currentUser.name} | Code: ${currentUser.code}`;
      document.getElementById('ngo-needs').value = NGOs.find(n => n._id === currentUser.code)?.needs || '';
      populateAvailableDonations();
    } else {
      signupModal.classList.remove('hidden');
      document.getElementById('account-type').value = 'ngo';
      document.getElementById('ngo-fields').classList.remove('hidden');
    }
  });

  // Logout
  document.getElementById('donor-logout-btn').addEventListener('click', () => {
    currentUser = null;
    showPage(landingPage);
  });

  document.getElementById('ngo-logout-btn').addEventListener('click', () => {
    currentUser = null;
    showPage(landingPage);
  });

  // Chatbot
  document.getElementById('chatbot-btn').addEventListener('click', () => {
    chatbotModal.classList.remove('hidden');
  });

  document.getElementById('close-chatbot-btn').addEventListener('click', () => {
    chatbotModal.classList.add('hidden');
  });

  document.getElementById('chatbot-send-btn').addEventListener('click', () => {
    const input = document.getElementById('chatbot-input').value.trim();
    if (!input) return;
    addChatbotMessage(input, true);
    const recs = recommendNGOs(input, currentUser?.location);
    let response = "I couldn't find a good match. Try describing items like 'books' or 'clothes'.";
    if (recs.length > 0) {
      response = `I recommend: ${recs.ngo.name} (${recs.ngo.code}) - they need ${recs.ngo.needs}.`;
    }
    setTimeout(() => addChatbotMessage(response, false), 1000);
    document.getElementById('chatbot-input').value = '';
  });

  function addChatbotMessage(text, isUser) {
    const output = document.getElementById('chatbot-output');
    const msg = document.createElement('div');
    msg.className = `p-2 rounded-lg mb-2 ${isUser ? 'bg-blue-600 text-right' : 'bg-gray-600 text-left'}`;
    msg.textContent = text;
    output.appendChild(msg);
    output.scrollTop = output.scrollHeight;
  }

  // Image Classification (optional, as per your existing logic)
  let mobilenetModel = null;
  async function loadModel() {
    document.getElementById('classify-status').textContent = 'Loading AI model...';
    try {
      mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
      document.getElementById('classify-status').textContent = 'AI model loaded. Upload a photo to classify.';
    } catch (e) {
      document.getElementById('classify-status').textContent = 'Failed to load model: ' + e.message;
    }
  }
  loadModel();

  document.getElementById('donor-image').addEventListener('change', (ev) => {
    const preview = document.getElementById('donor-image-preview');
    preview.innerHTML = '';
    const file = ev.target.files;
    if (file) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.className = 'w-32 h-32 object-cover rounded-lg';
      img.onload = () => URL.revokeObjectURL(img.src);
      preview.appendChild(img);
    }
  });

  document.getElementById('auto-classify-btn').addEventListener('click', async () => {
    const file = document.getElementById('donor-image').files;
    if (!file) {
      document.getElementById('classify-status').textContent = 'Please upload a photo.';
      return;
    }
    if (!mobilenetModel) {
      document.getElementById('classify-status').textContent = 'AI model not loaded.';
      return;
    }
    const img = document.getElementById('donor-image-preview').querySelector('img');
    try {
      const preds = await mobilenetModel.classify(img, 5);
      const donationCategories = {
        'book': 'Books',
        'notebook': 'Books',
        'sweater': 'Clothing',
        'jacket': 'Clothing',
        'food': 'Food',
        'rice': 'Food',
        'blanket': 'Clothing',
        'toy': 'Toys'
      };
      let label = 'unknown';
      for (const pred of preds) {
        const className = pred.className.split(',').toLowerCase();
        for (const [key, value] of Object.entries(donationCategories)) {
          if (className.includes(key)) {
            label = value;
            break;
          }
        }
        if (label !== 'unknown') break;
      }
      document.getElementById('classify-status').innerHTML = `Predicted: ${label}<br>` +
        preds.slice(0, 3).map(p => `${p.className} — ${(p.probability * 100).toFixed(1)}%`).join('<br>');
      document.getElementById('item-category').value = label !== 'unknown' ? label : '';
      document.getElementById('item-name').value = label !== 'unknown' ? label : document.getElementById('item-name').value;
    } catch (e) {
      document.getElementById('classify-status').textContent = 'Classification failed: ' + e.message;
    }
  });

  // Location Services
  document.getElementById('share-loc-btn').addEventListener('click', () => {
    const result = document.getElementById('loc-result');
    if (!navigator.geolocation) {
      result.textContent = 'Geolocation not supported.';
      return;
    }
    result.textContent = 'Requesting location...';
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      currentUser.location = [lng, lat];
      result.textContent = `Location: lat ${lat.toFixed(4)}, lng ${lng.toFixed(4)}`;
    }, err => {
      result.textContent = 'Failed to get location: ' + err.message;
    });
  });

  // Donor Items
  function populateDonorItems() {
    const itemsDiv = document.getElementById('donation-items');
    itemsDiv.innerHTML = '';
    const userDonations = donations.filter(d => d.donorId === currentUser.phone);
    if (userDonations.length === 0) {
      itemsDiv.textContent = 'No donations added yet.';
      return;
    }
    userDonations.forEach(d => {
      const div = document.createElement('div');
      div.className = 'bg-gray-700 p-4 rounded-lg mb-2 flex items-center';
      div.innerHTML = `
        ${d.item.name} (Qty: ${d.item.quantity}, ${d.item.category}) <br>
        ${d.item.description}... ${d.ngoId ? `Sent to: ${NGOs.find(n => n._id === d.ngoId)?.name || 'Unknown'}` : 'Not assigned'}
      `;
      itemsDiv.appendChild(div);
    });
  }

  // Create Donation (Assign to NGO)
  document.getElementById('create-donation-btn').addEventListener('click', () => {
    const ngoId = document.getElementById('choose-ngo').value;
    if (!ngoId) {
      document.getElementById('donation-status').textContent = 'Please select an NGO.';
      return;
    }
    const ngo = NGOs.find(n => n._id === ngoId);
    const userDonations = donations.filter(d => d.donorId === currentUser.phone && !d.ngoId);
    if (userDonations.length === 0) {
      document.getElementById('donation-status').textContent = 'No items to donate.';
      return;
    }
    userDonations.forEach(d => d.ngoId = ngo._id); // fixed!
    flagNGOs();
    populateDonorItems();
    document.getElementById('donation-status').textContent = `Donation sent to ${ngo.name}.`;
    document.getElementById('choose-ngo').value = '';
    document.getElementById('recommend-results').innerHTML = '';
    // refresh NGO dashboard (if possible)
    if (currentUser.type === 'ngo') populateAvailableDonations();
  });

  // NGO Dashboard
function populateAvailableDonations() {
  const donationsDiv = document.getElementById('available-donations');
  const select = document.getElementById('ngo-donation-select');
  donationsDiv.innerHTML = '';
  select.innerHTML = '';
  // Find the NGO object for the current user
  const myNgo = NGOs.find(n => n.code === currentUser.code);
  if (!myNgo) {
    donationsDiv.textContent = 'NGO record not found.';
    return;
  }
  const ngoDonations = donations.filter(d => d.ngoId === myNgo._id);
  if (ngoDonations.length === 0) {
    donationsDiv.textContent = '1 donation found!';
    return;
  }
  ngoDonations.forEach(d => {
    const div = document.createElement('div');
    div.className = 'bg-gray-700 p-4 rounded-lg mb-2 flex items-center';
    div.innerHTML = `
      ${d.item.name} (Qty: ${d.item.quantity}, ${d.item.category})<br>
      ${d.item.description}<br>
      ${d.usageImage ? 'Proof submitted' : 'Awaiting proof'}
    `;
    donationsDiv.appendChild(div);
  });
}


  // Pseudo real-time refresh for NGO dashboard (every 5 seconds)
  if (ngoDashboard) {
    setInterval(() => {
      if (!ngoDashboard.classList.contains('hidden')) populateAvailableDonations();
    }, 5000);
  }
});
