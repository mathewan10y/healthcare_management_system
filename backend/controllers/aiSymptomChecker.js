// backend/controllers/aiSymptomChecker.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const SymptomCheckLog = require("../models/SymptomCheckLog");
const logger = require("../config/logger");

exports.checkSymptoms = async (req, res) => {
  try {
    const { symptoms, age, sex } = req.body;

    // Input validation
    if (!symptoms || !age || !sex) {
      return res.status(400).json({
        success: false,
        message: "Symptoms, age, and sex are required.",
      });
    }

    if (typeof symptoms !== "string" || symptoms.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Please provide a detailed description of your symptoms.",
      });
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid age between 1 and 120.",
      });
    }

    if (!["male", "female", "other"].includes(sex.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Sex must be 'male', 'female', or 'other'.",
      });
    }

    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      logger.error("AI_API_KEY is not configured in backend/.env");
      return res.status(500).json({
        success: false,
        message: "AI service is not properly configured. Please contact support.",
      });
    }

    const masterPrompt = `
You are **MedAI**, an advanced AI Medical Information Assistant. Your goal is to interpret a user's natural symptom descriptions and provide accurate, safe, and educational information about possible causes — never medical diagnoses.

Follow these strict guidelines:
1. Patient Info:
- Reported Symptoms: "${symptoms.trim()}"
- Age: ${parsedAge}
- Sex: ${sex.toLowerCase()}

2. Validate Input:
If the text is clearly non-medical or gibberish (e.g. "I like pizza", "random text", "hello"), return:
{
  "error": "invalid_input",
  "message": "I can only provide information about medical symptoms. Please describe how you are feeling."
}

3. If symptoms are valid, generate:
- 3 to 5 potential conditions.
- For each:
  - "name": Condition name
  - "description": 1-2 sentence easy-to-understand explanation
  - "probability": "High", "Medium", or "Low"
- "firstAidSuggestion": Safe, practical first-aid / self-care tip
- "disclaimer": "This is not a medical diagnosis. Please consult a qualified doctor for accurate advice."

Return ONLY valid JSON matching this schema:
{
  "potentialConditions": [
    {
      "name": "string",
      "description": "string",
      "probability": "High"
    }
  ],
  "firstAidSuggestion": "string",
  "disclaimer": "string"
}
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Attempt with primary fast flash model, fallback to secondary if needed
    const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-pro"];
    let rawText = "";
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });
        const result = await model.generateContent(masterPrompt);
        rawText = result.response.text();
        if (rawText) break;
      } catch (err) {
        lastError = err;
        logger.warn(`Model ${modelName} failed in symptom checker: ${err.message}`);
      }
    }

    if (!rawText) {
      throw lastError || new Error("Failed to generate response from AI models");
    }

    // Clean any markdown formatting if present
    const cleanedText = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      logger.error("Failed to parse Gemini response:", cleanedText);
      return res.status(500).json({
        success: false,
        message: "AI service returned an invalid format. Please try again.",
      });
    }

    // Handle invalid input response from prompt
    if (jsonResponse.error) {
      try {
        await SymptomCheckLog.create({
          userId: req.user?.id,
          input: { symptoms: symptoms.trim(), age: parsedAge, sex: sex.toLowerCase() },
          error: `${jsonResponse.error}: ${jsonResponse.message}`,
          response: jsonResponse,
          meta: { ip: req.ip, userAgent: req.headers["user-agent"] },
        });
      } catch (logErr) {
        logger.error("Failed to save SymptomCheckLog:", logErr.message);
      }
      return res.status(400).json({
        success: false,
        error: jsonResponse.error,
        message: jsonResponse.message,
      });
    }

    if (!jsonResponse.potentialConditions || !Array.isArray(jsonResponse.potentialConditions)) {
      return res.status(500).json({
        success: false,
        message: "AI service returned an unexpected response structure. Please try again.",
      });
    }

    // Persist successful log
    try {
      await SymptomCheckLog.create({
        userId: req.user?.id,
        input: { symptoms: symptoms.trim(), age: parsedAge, sex: sex.toLowerCase() },
        resultSummary: {
          potentialConditionsCount: jsonResponse.potentialConditions.length,
          firstAidSuggestion: jsonResponse.firstAidSuggestion || "",
        },
        response: jsonResponse,
        meta: { ip: req.ip, userAgent: req.headers["user-agent"] },
      });
    } catch (logErr) {
      logger.error("Failed to save SymptomCheckLog:", logErr.message);
    }

    res.status(200).json({
      success: true,
      data: jsonResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in AI Symptom Checker:", error);

    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while analyzing symptoms. Please try again later.",
    });
  }
};

// GET /api/ai/check-symptoms/history (patient self)
exports.getMySymptomChecks = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SymptomCheckLog.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-response")
        .lean(),
      SymptomCheckLog.countDocuments({ userId: req.user.id }),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
};

// GET /api/ai/check-symptoms/admin (admin only)
exports.getAllSymptomChecks = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;

    const [items, total] = await Promise.all([
      SymptomCheckLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email role")
        .lean(),
      SymptomCheckLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: items, pagination: { page, limit, total } });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to fetch logs" });
  }
};