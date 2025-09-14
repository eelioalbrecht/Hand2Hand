const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { sendOTP, verifyOTP } = require("./utils");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let donations = [];

// Send OTP endpoint
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).send("Email required");

    try {
        await sendOTP(email);
        res.json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
});

// Verify OTP endpoint
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    if (verifyOTP(email, otp)) {
        res.json({ success: true, message: "OTP verified" });
    } else {
        res.status(400).json({ success: false, message: "Invalid OTP" });
    }
});

// Donation endpoint
app.post("/donate", (req, res) => {
    const { email, amount, comment } = req.body;
    if (!amount) return res.status(400).json({ success: false, message: "Amount required" });

    donations.push({ email, amount, comment });
    res.json({ success: true, message: "Donation successful" });
});

// Get all donations (Admin)
app.get("/admin/donations", (req, res) => {
    res.json(donations);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
