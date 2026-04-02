require("dotenv").config();
const { askAI } = require("./openaiService");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let messages = [];

async function chat() {

  rl.question("You: ", async (input) => {

    messages.push({
      role: "user",
      content: input
    });
    const reply = await askAI(messages);

    console.log("\nAI:", reply, "\n");

    messages.push({
      role: "assistant",
      content: reply
    });

    chat();

  });

}

chat();