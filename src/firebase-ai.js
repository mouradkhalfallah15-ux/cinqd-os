
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "react-hot-toast";

// Use environment variable if available, otherwise fallback (replace with your key in production safely)
const API_KEY = import.meta.env.PUBLIC_GEMINI_API_KEY || "YOUR_API_KEY";

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// --- Cost Simulation (remains from previous version) ---
let dailyCost = 0;
export const getDailyCost = () => dailyCost;
// ... (calculateCost logic as before)

/**
 * Chat logic for the AI Auditeur in Tunisian Derja
 */
export async function getAIAuditeurChat(userMessage, context) {
    const { branchId, rawMaterials, productionOrders } = context;

    const prompt = `
    ROLE: You are "Cinqd AI Auditeur", an expert business analyst and accountant. 
    LANGUAGE: Respond in Tunisian Derja (Arabic script or Latin, but prefer Arabic script for authenticity if appropriate, or natural Derja). 
    
    CONTEXT:
    - Branch: ${branchId}
    - Raw Materials (Costs): ${JSON.stringify(rawMaterials)}
    - Recent Production Orders: ${JSON.stringify(productionOrders)}

    MISSION:
    - Answer the user's questions about profits, costs of materials (like Labsa, N70), and production efficiency.
    - If asked about profits, calculate based on (Total Revenue - Total Material Cost).
    - Be professional yet local in your tone.
    
    USER QUESTION: "${userMessage}"
    
    If you see raw materials like 'Labsa' or 'N70', use their specific prices from the context to give an accurate report.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
}

// ... rest of previous functions (getAiAudit, getAiPoweredProductionPlan)
// Ensure they also use the correct API_KEY and model.

export async function getAiAudit(productionOrders, packagingStock) {
  const prompt = `
    ROLE: Auditeur Stratégique Cinqd.
    MISSION: Analyser les 5 dernières commandes: ${JSON.stringify(productionOrders)} et stocks: ${JSON.stringify(packagingStock)}.
    FORMAT: JSON.
  `;
  const result = await model.generateContent(prompt);
  const text = await result.response.text();
  const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanedText);
}

export async function getAiPoweredProductionPlan(totalVolume, packagingOptions) {
    const prompt = `
    ROLE: Ingénieur Logistique Cinqd.
    MISSION: Plan pour ${totalVolume}L avec options ${JSON.stringify(packagingOptions)}.
    FORMAT: JSON.
    `;
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
}
