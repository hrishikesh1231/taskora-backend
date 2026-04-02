import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const validateGigAI = async (title, description) => {

  const prompt = `
Check the following gig content.

Reject if it contains:
- harmful content
- sexual services
- illegal jobs
- scam requests
- gibberish text
- meaningless words

Title: ${title}

Description: ${description}

Respond ONLY in JSON:

{
 "valid": true/false,
 "reason": "short reason"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0
  });

  return JSON.parse(response.choices[0].message.content);
};