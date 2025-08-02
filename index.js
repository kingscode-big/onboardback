 require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();
app.use('/public', express.static('public'));

app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected'))
  .catch(err => console.error('Mongo Atlas connection error:', err));

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

// ✅ Route: Submit Onboarding Info & Send Proposal Email
app.post('/api/onboarding', async (req, res) => {
  const data = req.body;

  try {
    if (!Array.isArray(data.features)) {
      if (typeof data.features === 'string') {
        data.features = data.features.split(',').map(f => f.trim());
      } else {
        data.features = [];
      }
    }

    data.budget = Number(data.budget);
    const saved = await Onboarding.create(data);

    const featureList = data.features.length > 0
      ? data.features.map(f => `<li>${f}</li>`).join('')
      : '<li>No additional features selected</li>';

    // ✅ Customized HTML Email with Branding and CTA
    const proposalHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <img src="https://onboardin.netlify.app/kingii.png" alt="Brand Logo" style="height: 60px; margin-bottom: 20px;" />

        <h2 style="color: #333;">Hi there!</h2>
        <p>Thanks for submitting your website requirements. Here's a quick summary:</p>

        <ul style="line-height: 1.6;">
          <li><strong>Website Type:</strong> ${data.websiteType}</li>
          <li><strong>Build Method:</strong> ${data.buildMethod}</li>
          <li><strong>Budget:</strong> $${data.budget}</li>
          <li><strong>Deadline:</strong> ${data.deadline}</li>
          <li><strong>Features:</strong>
            <ul>${featureList}</ul>
          </li>
        </ul>

        <p>We're excited to help! To get started, please confirm your project and share branding details.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://onboardin.netlify.app/brandingForm/${saved._id}"
            style="background: #007bff; color: white; text-decoration: none; padding: 12px 20px; border-radius: 5px;">
            ✅ Approve & Continue
          </a>
        </div>

        <p>Talk soon,<br/> <strong> kiNGSLEY</strong></p>
        <img src="https://yourdomain.com/you.jpg" alt="Your photo" style="height: 60px; border-radius: 50%; margin-top: 10px;" />
      </div>
    `;

    // ✅ Send Email to Client
    await transporter.sendMail({
      from: `"Your Company" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: `Your Website Proposal: ${data.websiteType}`,
      html: proposalHtml
    });

    // ✅ Optional internal notification
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: '📥 New Onboarding Submission',
      text: `
        New onboarding submitted:

        Website Type: ${data.websiteType}
        Build Method: ${data.buildMethod}
        Features: ${data.features.join(', ') || 'None'}
        Budget: $${data.budget}
        Deadline: ${data.deadline}
        Client Email: ${data.email}
      `
    });

    res.status(200).json({ message: 'Proposal sent to client successfully' });

  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ message: 'Failed to submit onboarding.' });
  }
});

// ✅ Route: Save branding form (after CTA is clicked)
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
