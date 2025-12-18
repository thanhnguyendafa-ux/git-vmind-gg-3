
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { useApiKeyStore } from '../stores/useApiKeyStore';

// This error message will be caught by the UI components.
const API_KEY_ERROR_MESSAGE = "API_KEY_MISSING";

// Per coding guidelines, the API key must be obtained from `process.env.API_KEY`.
// The client should be initialized within each function call to ensure it uses the latest key if it changes (e.g., in Veo context).
const getAiClient = (): GoogleGenAI => {
  // Use only the user-provided key from the store.
  const apiKey = useApiKeyStore.getState().apiKey;
  if (!apiKey) {
    // This will now be the standard way to handle missing keys.
    throw new Error(API_KEY_ERROR_MESSAGE);
  }
  return new GoogleGenAI({ apiKey });
};


export const generateExampleSentence = async (word: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `As an English language tutor, write a single, clear, and concise example sentence for the vocabulary word: "${word}". The sentence should be easy for a language learner to understand and clearly demonstrate the word's meaning.`,
        config: {
          temperature: 0.7,
          maxOutputTokens: 50,
          // Per Gemini docs, add thinkingConfig when using maxOutputTokens with gemini-2.5-flash to avoid empty responses.
          thinkingConfig: { thinkingBudget: 25 },
        }
    });
    // @google/genai: Use the .text property to extract the response text, not the .text() method.
    return (response.text ?? '').trim();
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error; // Re-throw the specific error for the UI to catch
    }
    console.error("Error generating sentence with Gemini:", error);
    return "Could not generate sentence.";
  }
};

export const explainText = async (text: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an English tutor. Explain the following word or phrase in a simple and concise way for a vocabulary learner. Your explanation must include a definition and one clear example sentence.\n\nText: "${text}"`,
        config: {
          temperature: 0.5,
          maxOutputTokens: 150,
          thinkingConfig: { thinkingBudget: 75 },
        }
    });
    // @google/genai: Use the .text property to extract the response text, not the .text() method.
    return (response.text ?? '').trim();
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error explaining text with Gemini:", error);
    return "Could not get explanation.";
  }
};

export const generateForPrompt = async (promptTemplate: string, sourceValues: Record<string, string>): Promise<string> => {
  // Updated regex to handle both {{Column Name}} and {Column Name}
  const filledPrompt = promptTemplate.replace(/{{\s*(.*?)\s*}}|{\s*(.*?)\s*}/g, (_, p1, p2) => {
    const columnName = (p1 || p2).trim();
    return sourceValues[columnName] || `[${columnName}]`;
  });

  try {
    const ai = getAiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: filledPrompt,
        config: {
          systemInstruction: "You are a helpful assistant for a vocabulary learning app. Fulfill the user's request accurately and concisely, providing only the requested information without any extra conversational text.",
          temperature: 0.8,
          maxOutputTokens: 100,
          thinkingConfig: { thinkingBudget: 50 },
        }
    });
    // @google/genai: Use the .text property to extract the response text, not the .text() method.
    return (response.text ?? '').trim().replace(/^"|"$/g, '');
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error generating for prompt with Gemini:", error);
    return "Generation failed.";
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? '';
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error generating speech with Gemini:", error);
    return "";
  }
};

export const generateHint = async (word: string, context: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a helpful study assistant. A user is trying to guess the word "${word}". The context they have is: "${context}". Provide a very short, one-sentence hint to guide them. Important: Do not use the word "${word}" or any of its direct forms in your hint.`,
            config: {
                temperature: 0.8,
                maxOutputTokens: 40,
                thinkingConfig: { thinkingBudget: 20 },
            }
        });
        // @google/genai: Use the .text property to extract the response text, not the .text() method.
        return (response.text ?? '').trim();
    } catch (error: any) {
        if (error.message === API_KEY_ERROR_MESSAGE) {
            throw error;
        }
        console.error("Error generating hint with Gemini:", error);
        return "Could not generate a hint at this time.";
    }
};


export const generateImageFromText = async (prompt: string): Promise<string> => {
    try {
        const ai = getAiClient();
        // @google/genai: Use generateContent with gemini-2.5-flash-image instead of deprecated generateImages
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: `Create a visually striking, high-quality image representing: "${prompt}". Art style: minimalist photorealism with a clean, uncluttered background and soft, natural lighting. The image should be symbolic and clear, perfect for a vocabulary flashcard.`,
                    },
                ],
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                },
            },
        });
        
        // @google/genai: Iterate through parts to find the image data, as it's not guaranteed to be the first part.
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                if (!base64ImageBytes) {
                    throw new Error("No image data returned from API.");
                }
                 return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        
       throw new Error("No image part found in the response.");

    } catch (error: any) {
        if (error.message === API_KEY_ERROR_MESSAGE) {
            throw error;
        }
        console.error("Error generating image with Gemini:", error);
        throw new Error("Could not generate image.");
    }
};

export const continueChat = async (history: { role: 'user' | 'model'; parts: { text: string }[] }[]): Promise<string> => {
  try {
    const ai = getAiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: history,
        config: {
          systemInstruction: 'You are Vmind, a friendly and helpful AI assistant for vocabulary learners. Keep your answers concise and focused on helping the user learn.',
          temperature: 0.8,
        }
    });
    // @google/genai: Use the .text property to extract the response text, not the .text() method.
    return (response.text ?? '').trim();
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error continuing chat with Gemini:", error);
    return "Sorry, I couldn't process that. Please try again.";
  }
};


export const generateContextualSuggestions = async (screenName: string, context?: string): Promise<string[]> => {
  const prompt = `You are Vmind, a helpful AI assistant for vocabulary learners. The user just opened the chatbot on the '${screenName}' screen. ${context ? `The specific context is: ${context}.` : ''} Provide two brief, actionable, and distinct suggestions for what they can do here. The suggestions should be phrased as commands or questions the user might ask. Do not add any preamble or explanation.`;

  try {
    const ai = getAiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'An array of two string suggestions.'
            }
          },
          required: ['suggestions']
        },
        temperature: 0.7,
      },
    });
    
    // @google/genai: Use the .text property to extract the response text, not the .text() method.
    const jsonStr = (response.text ?? '').trim();
    if (jsonStr) {
      const result = JSON.parse(jsonStr);
      return result.suggestions || [];
    }
    return [];
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error generating contextual suggestions with Gemini:", error);
    return [];
  }
};