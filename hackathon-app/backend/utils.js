const nodemailer = require("nodemailer");

// Configure SMTP (replace with your real email and app password)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "youremail@gmail.com",
        pass: "yourapppassword"
    }
});

const OTP_STORE = {};

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(email) {
    const otp = generateOTP();
    OTP_STORE[email] = otp;

    const mailOptions = {
        from: "sastrypranavsomayaji@gmail.com",
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP is: ${otp}`
    };

    await transporter.sendMail(mailOptions);
    return otp;
}

function verifyOTP(email, otp) {
    return OTP_STORE[email] === otp;
}

module.exports = { sendOTP, verifyOTP };
