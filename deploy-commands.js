require("dotenv").config();

const { REST, Routes } = require("discord.js");
const { COMMANDS_JSON } = require("./src/constants/commands");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  throw new Error("DISCORD_TOKEN et CLIENT_ID sont requis.");
}

const rest = new REST({ version: "10" }).setToken(token);

async function deploy() {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: COMMANDS_JSON
    });
    console.log("Commandes déployées sur le serveur.");
    return;
  }

  await rest.put(Routes.applicationCommands(clientId), {
    body: COMMANDS_JSON
  });
  console.log("Commandes déployées globalement.");
}

deploy().catch((error) => {
  console.error("Échec du déploiement:", error);
  process.exit(1);
});
