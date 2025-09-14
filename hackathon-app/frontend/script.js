let currentUser = "";
const API_URL = "http://localhost:3000";

// Send OTP
async function sendOTP() {
    const email = document.getElementById("email").value;
    if (!email) return alert("Enter your email");

    const res = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (data.success) {
        currentUser = email;
        document.getElementById("login-msg").textContent = "OTP sent! Check your email";
    } else {
        alert(data.message);
    }
}

// Verify OTP
async function verifyOTP() {
    const otp = document.getElementById("otp").value;
    const res = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser, otp })
    });

    const data = await res.json();
    if (data.success) {
        document.getElementById("login-container").style.display = "none";

        if (currentUser === "admin@example.com") {
            document.getElementById("admin-container").style.display = "block";
        } else {
            document.getElementById("donation-container").style.display = "block";
        }
    } else {
        alert(data.message);
    }
}

// Donate + AI Response
async function makeDonation() {
    const amount = document.getElementById("amount").value;
    const comment = document.getElementById("comment").value;

    const res = await fetch(`${API_URL}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser, amount, comment })
    });

    const data = await res.json();
    if (data.success) {
        alert(`Donated ${amount} successfully!`);
        document.getElementById("ai-response").textContent = aiModule(comment || "Thank you");
    } else {
        alert(data.message);
    }
}

// Load donations for Admin
async function loadDonations() {
    const res = await fetch(`${API_URL}/admin/donations`);
    const donations = await res.json();

    const list = document.getElementById("donation-list");
    list.innerHTML = "";
    donations.forEach(d => {
        const li = document.createElement("li");
        li.textContent = `${d.email} donated ${d.amount} - "${d.comment}"`;
        list.appendChild(li);
    });
}

// Simple AI simulation
function aiModule(input) {
    return "AI Response: " + input.split("").reverse().join("");
}
