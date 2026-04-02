const { askAI } = require("./utils/openaiService");

require("dotenv").config();

// const { askAI } = require("./openaiService");

async function test() {

  const res = await askAI("Hello AI");

  console.log(res);

}

test();