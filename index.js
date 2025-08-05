 require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

// Serve static files like images from /public
app.use('/public', express.static('public'));

app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Schema for onboarding + branding details
const onboardingSchema = new mongoose.Schema({
  websiteType: String,
  buildMethod: String,
  features: [String],
  budget: Number,
  deadline: String,
  email: String,
  brandName: String,
  logoUrl: String,
  colorPreferences: String,
  additionalImages: [String],
  contactInfo: String
});

const Onboarding = mongoose.model('Boarding', onboardingSchema);

// ✅ Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ Route: Submit onboarding + Send proposal email
app.post('/api/onboarding', async (req, res) => {
  const data = req.body;

  try {
    // Normalize features
    if (!Array.isArray(data.features)) {
      if (typeof data.features === 'string') {
        data.features = data.features.split(',').map(f => f.trim());
      } else {
        data.features = [];
      }
    }

    data.budget = Number(data.budget);

    // Save to DB
    const saved = await Onboarding.create(data);

    // Generate HTML list for email
    const featureList = data.features.length > 0
      ? data.features.map(f => `<li>${f}</li>`).join('')
      : '<li>No additional features selected</li>';

    // ✅ Email HTML template
    const proposalHtml = `
      <div style="font-family: 'Arial', sans-serif; background-color: #e9ecef; padding: 30px;">
        <div style="max-width: 600px; background: #ffffff; margin: auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px;">

          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://onboardin.netlify.app/kingii.png" alt="Brand Logo" style="height: 60px;" />
          </div>

          <h2 style="color: #343a40; font-size: 24px;">👋 Hello!</h2>
          <p style="color: #6c757d;">Thank you for submitting your website request. Here's a quick overview of what you've selected:</p>

          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr><td style="padding: 10px; color: #495057;"><strong>Website Type:</strong></td><td style="padding: 10px; color: #212529;">${data.websiteType}</td></tr>
            <tr><td style="padding: 10px; color: #495057;"><strong>Build Method:</strong></td><td style="padding: 10px; color: #212529;">${data.buildMethod}</td></tr>
            <tr><td style="padding: 10px; color: #495057;"><strong>Budget:</strong></td><td style="padding: 10px; color: #212529;">$${data.budget}</td></tr>
            <tr><td style="padding: 10px; color: #495057;"><strong>Deadline:</strong></td><td style="padding: 10px; color: #212529;">${data.deadline}</td></tr>
            <tr>
              <td style="padding: 10px; color: #495057;"><strong>Features:</strong></td>
              <td style="padding: 10px; color: #212529;"><ul style="padding-left: 18px; margin: 0;">${featureList}</ul></td>
            </tr>
          </table>

          <p style="color: #343a40; margin-top: 30px;">🎯 To move forward, please confirm and share your brand details:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://onboardin.netlify.app/branding/${saved._id}"
              style="background: #007bff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              ✅ Approve & Continue
            </a>
          </div>

          <div style="margin-top: 40px; text-align: center;">
            <p style="color: #6c757d;">Best regards,</p>
            <p style="font-weight: bold; color: #212529;">Kingsley</p>
            <img src="https://onboardin.netlify.app/kingii.png" alt="Kingsley" style="height: 60px; border-radius: 50%; margin-top: 10px;" />
          </div>

        </div>
      </div>
    `;

    // ✅ Send email to user
    await transporter.sendMail({
      from: `"Your Company" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: `Your Website Proposal: ${data.websiteType}`,
      html: proposalHtml
    });

    // ✅ Optional: notify internal team
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: '📥 New Onboarding Submission',
      text: `
        Website Type: ${data.websiteType}
        Build Method: ${data.buildMethod}
        Features: ${data.features.join(', ') || 'None'}
        Budget: $${data.budget}
        Deadline: ${data.deadline}
        Email: ${data.email}
      `
    });

    res.status(200).json({ message: 'Proposal sent to client successfully' });

  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ message: 'Failed to submit onboarding.' });
  }
});

// ✅ Route: Save branding form details (POST /api/client-details/:id)
app.post('/api/client-details/:id', async (req, res) => {
  const { id } = req.params;
  const { brandName, logoUrl, colorPreferences, additionalImages, contactInfo } = req.body;

  try {
    const updated = await Onboarding.findByIdAndUpdate(id, {
      brandName,
      logoUrl,
      colorPreferences,
      additionalImages,
      contactInfo
    }, { new: true });

    if (!updated) return res.status(404).json({ message: 'Client not found' });

    res.status(200).json({ message: 'Branding details saved successfully' });

  } catch (err) {
    console.error('Branding form error:', err);
    res.status(500).json({ message: 'Failed to save branding info' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
