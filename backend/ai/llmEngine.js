const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_KEY
});

async function generateExplanation(prompt) {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You are a helpful AI tutor for students."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7
  });

  return response.choices[0].message.content;
}

module.exports = generateExplanation;