 require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
 require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected'))
  .catch(err => console.error('Mongo Atlas connection error:', err));


// Schema
const onboardingSchema = new mongoose.Schema({
  websiteType: String,
  buildMethod: String,
  features: [String],
  budget: Number,
  deadline: String
});

const Onboarding = mongoose.model('Boarding', onboardingSchema);

// Nodemailer setup

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '********' : undefined);

const transporter = nodemailer.createTransport({
    
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
  
});

// API route
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
 
    const featureList = data.features.join(', ') || 'None';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: 'New Onboarding Submission',
      text: `
        New onboarding submitted:

        Website Type: ${data.websiteType}
        Build Method: ${data.buildMethod}
        Features: ${featureList}
        Budget: $${data.budget}
        Deadline: ${data.deadline}
            `
            };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Website details sent ,We will get back to you shortly' });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ message: 'Failed to submit onboarding.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
