export interface AIResponse {
  text: string;
  error?: string;
}

export const aiService = {
  async generateContent(prompt: string, model: string = "gemini-3-flash-preview"): Promise<AIResponse> {
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, model }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content");
      }

      return await response.json();
    } catch (error: any) {
      console.error("AI Service Error:", error);
      return { text: "", error: error.message };
    }
  }
};
