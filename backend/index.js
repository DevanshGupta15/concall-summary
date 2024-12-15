const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN
}));
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Earnings Transcript Analysis Endpoint
app.post('/api/analyze-transcript', async (req, res) => {
  console.log('Received request to analyze transcript');

  try {
    const { transcriptText } = req.body;

    // Log incoming transcriptText
    console.log('Received transcriptText:', transcriptText);

    // Validate input
    if (!transcriptText) {
      console.log('Error: No transcript text provided');
      return res.status(400).json({ error: 'Transcript text is required' });
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Detailed prompt for analysis
    const prompt = `Analyze this earnings call transcript professionally:

    Transcript: ${transcriptText}

    Provide a structured analysis with:
    1. Key Questions Identified
    2. Management Tone & Sentiment
    3. Critical Trends 
    4. Actionable Investor Insights
    5. Forward-looking Growth Indicators

    Respond in a clear, concise JSON format with each section well-explained.`;

    console.log('Generated prompt for Gemini AI:', prompt);

    // Generate analysis
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = await response.text(); // Make sure response.text() is awaited

    // Log the raw analysis
    console.log('Raw analysis received:', analysisText);

    // Clean the response:
    // 1. Strip markdown-like backticks or code block formatting
    // 2. Normalize whitespace to collapse extra spaces, tabs, and newlines
    // 3. Remove unwanted prefixes like `JSON{` or other invalid characters
    // Clean the response:
let cleanedAnalysis = analysisText
.replace(/```json|```|\n/g, '')    // Remove code block formatting
.replace(/^\s*JSON\{/i, '{')       // Remove unwanted "JSON" prefix
.replace(/\s+/g, ' ')              // Collapse multiple spaces, tabs, and newlines into one space
.replace(/,\s*}/g, '}')            // Remove trailing commas before closing brace
.replace(/,\s*\]/g, ']')           // Remove trailing commas before closing bracket
.trim();                          // Trim leading/trailing spaces

// Log cleaned analysis
console.log('Cleaned analysis:', cleanedAnalysis);

// Parse analysis
let parsedAnalysis;
try {
parsedAnalysis = JSON.parse(cleanedAnalysis);
console.log('Parsed analysis:', parsedAnalysis);
} catch (error) {
console.error('Error parsing the analysis:', error);
// In case parsing fails, send the raw cleaned content for further inspection
parsedAnalysis = { rawAnalysis: cleanedAnalysis };
}

// Respond with the parsed analysis or raw analysis if parsing fails
res.json({
success: true,
analysis: parsedAnalysis,
timestamp: new Date().toISOString()
});

  } catch (error) {
    console.error('Transcript Analysis Error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze transcript', 
      details: error.message 
    });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check request received');
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
