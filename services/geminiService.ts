import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

const extractImage = (response: any) => {
   const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No content generated");
  for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
  }
  throw new Error("No image data found");
}

export const generateIcon = async (prompt: string, isSpriteSheet: boolean = false): Promise<string> => {
  const ai = getClient();
  
  const enhancedPrompt = isSpriteSheet 
    ? `Generate a sprite sheet containing an animation sequence for: ${prompt}. The output must be a grid of frames (e.g. 3x3 or 4x4) on a solid or transparent background, suitable for game animation. Keep the character consistent.`
    : `A high quality app icon, flat design or 3d style depending on request, centered, transparent background if possible or solid color. ${prompt}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: enhancedPrompt,
        },
      ],
    },
  });

  return extractImage(response);
};

export const animateExistingIcon = async (imageBase64: string, prompt: string = "Walking cycle"): Promise<string> => {
    const ai = getClient();
    // Strip prefix if present for the API call
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
                { text: `Create a sprite sheet animation sequence based on this character/icon. Action: ${prompt}. Grid layout, consistent style.` }
            ]
        }
    });
    return extractImage(response);
}
