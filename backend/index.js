const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Folder to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
});

// Earnings Transcript Analysis Endpoint (with file upload)
app.post('/api/analyze-transcript', upload.single('pdf'), async (req, res) => {
  console.log('Received file:', req.file);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pdfPath = req.file.path;
    console.log('PDF Path:', pdfPath);

    // You can now parse the PDF file, for example, using a PDF parsing library like `pdf-parse`
    const fs = require('fs');
    const pdfParse = require('pdf-parse');
    const pdfData = fs.readFileSync(pdfPath);
    const pdfText = await pdfParse(pdfData);

    // Extract the transcript text from the parsed PDF
    const transcriptText = pdfText.text;

    // Analyze the transcript using the AI model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analyze this earnings call transcript professionally:

    Transcript: ${transcriptText}

    Provide a structured analysis with:
    1. Key Questions Identified
    2. Management Tone & Sentiment
    3. Critical Trends 
    4. Actionable Investor Insights
    5. Forward-looking Growth Indicators

    Respond in a clear, concise JSON format with each section well-explained in short`;

    const result = await model.generateContent(prompt);
    console.log('Full API response:', result);

    const response = await result.response;
    const analysisText = await response.text();

    // Clean and parse the analysis
    let cleanedAnalysis = analysisText
      .replace(/```json|```|\n/g, '')  // Remove code block formatting
      .replace(/^\s*JSON\{/i, '{')     // Remove unwanted "JSON" prefix
      .replace(/\s+/g, ' ')           // Collapse multiple spaces, tabs, and newlines into one space
      .trim();

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(cleanedAnalysis);
      console.log("Parsed Analysis:", parsedAnalysis);
    } catch (error) {
        
      parsedAnalysis = { rawAnalysis: cleanedAnalysis };
    }

    res.json({
      success: true,
      analysis: parsedAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing PDF file:', error);
    res.status(500).json({
      error: 'Failed to analyze transcript',
      details: error.message
    });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Earnings Transcript Analyzer'
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
