require("dotenv").config();

const {
  ActivityType,
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  GatewayIntentBits,
  InteractionType,
  PermissionFlagsBits
} = require("discord.js");
const os = require("node:os");
const { spawn } = require("node:child_process");

const { findItemsByQuery } = require("./src/constants/items");
const { COMMAND_BUILDERS } = require("./src/constants/commands");
const {
  addPermissionRole,
  addToStock,
  buildExportFile,
  clearPermissionRoles,
  getHistoryView,
  getItemStockById,
  getPermissionsConfig,
  getStockStats,
  getStockView,
  getTopItemsByAction,
  removeFromStock,
  removePermissionRole,
  resetItemStock,
  searchStockEntries
} = require("./src/services/stock-service");
const {
  createErrorEmbed,
  createExportEmbed,
  createHelpEmbeds,
  createHistoryEmbed,
  createItemSheetEmbed,
  createLogEmbed,
  createPermissionDeniedEmbed,
  createPermissionsEmbed,
  createResetSuccessEmbed,
  createSearchResultsEmbed,
  createStatsEmbed,
  createSuccessEmbed,
  createTopEmbed,
  createUptimeEmbed,
  createUptimeRestartingEmbed
} = require("./src/utils/embeds");
const {
  buildStockPages,
  createButtons,
  deleteSession,
  getSession,
  registerSession,
  updateSessionPages
} = require("./src/utils/stock-pagination");

const REQUIRED_ENV = ["DISCORD_TOKEN", "CLIENT_ID"];
const CONFIRMATION_KEYWORD = "CONFIRMER";
const UPTIME_REFRESH_MS = 5000;
const UPTIME_SESSION_TTL_MS = 60 * 60 * 1000;
const PERMISSION_ACTION_NAMES = {
  add: "ajouter-au-stock",
  remove: "retirer-du-stock",
  reset: "reset-item"
};
const uptimeSessions = new Map();

for (const variableName of REQUIRED_ENV) {
  if (!process.env[variableName]) {
    throw new Error(`Variable d'environnement manquante : ${variableName}`);
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

function normalizeForAutocomplete(value) {
  return `${value ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectHostProvider() {
  if (process.env.RENDER) return "Render";
  if (process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID) return "Railway";
  if (process.env.HEROKU_APP_NAME || process.env.DYNO) return "Heroku";
  if (process.env.FLY_APP_NAME) return "Fly.io";
  if (process.env.KOYEB_APP_NAME) return "Koyeb";
  if (process.env.VERCEL) return "Vercel";
  if (process.env.NETLIFY) return "Netlify";
  if (process.env.AWS_EXECUTION_ENV || process.env.ECS_CONTAINER_METADATA_URI) return "AWS";
  if (process.env.GOOGLE_CLOUD_PROJECT || process.env.K_SERVICE) return "Google Cloud";
  if (process.env.WEBSITE_INSTANCE_ID || process.env.AZURE_HTTP_USER_AGENT) return "Azure";
  if (process.env.PM2_HOME || process.env.pm_id) return "PM2";
  return "Local / non détecté";
}

function getUptimePayload() {
  const startedAtEpoch = Math.floor(((client.readyTimestamp || Date.now()) / 1000));
  const wsPingMs = Number.isFinite(client.ws.ping) ? Math.round(client.ws.ping) : 0;
  const processUptimeMs = Math.round(process.uptime() * 1000);
  const memoryMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

  return {
    startedAtEpoch,
    wsPingMs,
    processUptimeMs,
    hostProvider: detectHostProvider(),
    hostName: os.hostname(),
    nodeVersion: process.version,
    memoryMb
  };
}

function createUptimeComponents(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("uptime_refresh")
        .setLabel("🔄 Actualiser")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("uptime_restart")
        .setLabel("Redémarrer le bot")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    )
  ];
}

function clearUptimeSession(messageId) {
  const session = uptimeSessions.get(messageId);
  if (!session) {
    return;
  }

  if (session.interval) {
    clearInterval(session.interval);
  }
  if (session.timeout) {
    clearTimeout(session.timeout);
  }
  uptimeSessions.delete(messageId);
}

function extendUptimeSession(session) {
  if (session.timeout) {
    clearTimeout(session.timeout);
  }

  session.expiresAt = Date.now() + UPTIME_SESSION_TTL_MS;
  session.timeout = setTimeout(async () => {
    try {
      await session.message.edit({
        embeds: [createUptimeEmbed(getUptimePayload())],
        components: createUptimeComponents(true)
      });
    } catch {
      // Message supprimé ou inaccessible.
    } finally {
      clearUptimeSession(session.message.id);
    }
  }, UPTIME_SESSION_TTL_MS);
  session.timeout.unref?.();
}

function registerUptimeSession(message, ownerId) {
  clearUptimeSession(message.id);

  const session = {
    message,
    ownerId,
    isUpdating: false,
    interval: null,
    timeout: null,
    expiresAt: Date.now() + UPTIME_SESSION_TTL_MS
  };

  session.interval = setInterval(async () => {
    if (session.isUpdating) {
      return;
    }
    session.isUpdating = true;
    try {
      await session.message.edit({
        embeds: [createUptimeEmbed(getUptimePayload())],
        components: createUptimeComponents(false)
      });
    } catch {
      clearUptimeSession(message.id);
    } finally {
      session.isUpdating = false;
    }
  }, UPTIME_REFRESH_MS);
  session.interval.unref?.();

  uptimeSessions.set(message.id, session);
  extendUptimeSession(session);
}

function restartBotProcess() {
  const managedBySupervisor = Boolean(
    process.env.pm_id ||
      process.env.PM2_HOME ||
      process.env.RENDER ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.HEROKU_APP_NAME ||
      process.env.FLY_APP_NAME ||
      process.env.K_SERVICE ||
      process.env.KOYEB_APP_NAME
  );

  if (managedBySupervisor) {
    process.exit(0);
    return;
  }

  const child = spawn(process.execPath, process.argv.slice(1), {
    cwd: process.cwd(),
    env: process.env,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
  process.exit(0);
}

async function publishLog(interaction, result) {
  const channelId = process.env.LOG_CHANNEL_ID;
  if (!channelId) {
    return;
  }

  try {
    const logChannel = await client.channels.fetch(channelId);
    if (!logChannel || !logChannel.isTextBased()) {
      return;
    }

    const mention = `<@${interaction.user.id}>`;
    await logChannel.send({
      content: `${mention} a effectué une action sur le stock.`,
      embeds: [createLogEmbed(result, `${interaction.user.tag} (${mention})`)]
    });
  } catch (error) {
    console.error("Impossible d'envoyer le log Discord :", error);
  }
}

function buildMutationPayload(interaction) {
  return {
    itemId: interaction.options.getString("item", true),
    quantity: interaction.options.getInteger("quantite", true),
    durability: interaction.options.getInteger("durabilite"),
    enchantment: interaction.options.getString("enchantement"),
    user: {
      id: interaction.user.id,
      tag: interaction.user.tag
    }
  };
}

async function getMemberRoleIds(interaction) {
  if (!interaction.inGuild()) {
    return [];
  }

  const rawRoles = interaction.member?.roles;
  if (Array.isArray(rawRoles)) {
    return rawRoles;
  }

  if (rawRoles?.cache) {
    return Array.from(rawRoles.cache.keys());
  }

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    return Array.from(member.roles.cache.keys());
  } catch {
    return [];
  }
}

async function ensureActionPermission(interaction, action) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      embeds: [createErrorEmbed("Cette commande doit être utilisée sur un serveur.")],
      ephemeral: true
    });
    return false;
  }

  const permissions = await getPermissionsConfig();
  const allowedRoles = permissions[action] || [];
  if (!allowedRoles.length) {
    return true;
  }

  const memberRoleIds = await getMemberRoleIds(interaction);
  const isAllowed = allowedRoles.some((roleId) => memberRoleIds.includes(roleId));
  if (isAllowed) {
    return true;
  }

  await interaction.reply({
    embeds: [createPermissionDeniedEmbed(action)],
    ephemeral: true
  });
  return false;
}

function getAllItemAutocompleteResults(focusedValue) {
  const matchingItems = findItemsByQuery(focusedValue).slice(0, 25);
  return matchingItems.map((item) => ({
    name: item.name,
    value: item.id
  }));
}

async function getStockItemAutocompleteResults(focusedValue) {
  const stockView = await getStockView();
  const normalizedQuery = normalizeForAutocomplete(focusedValue || "");

  return stockView.entries
    .filter((entry) => {
      if (!normalizedQuery) {
        return true;
      }

      return normalizeForAutocomplete(entry.itemName).includes(normalizedQuery);
    })
    .slice(0, 25)
    .map((entry) => ({
      name: entry.itemName,
      value: entry.itemId
    }));
}

function matchesDurability(variant, selectedDurability) {
  if (selectedDurability === null || selectedDurability === undefined) {
    return true;
  }
  return variant.durability === selectedDurability;
}

function matchesEnchantment(variant, selectedEnchantment) {
  if (!selectedEnchantment) {
    return true;
  }
  return (variant.enchantment || "").toLowerCase() === selectedEnchantment.toLowerCase();
}

function getDurabilityAutocompleteResults(entry, focusedValue) {
  const quantityByDurability = new Map();
  for (const variant of entry.variants) {
    if (variant.durability === null || variant.durability === undefined) {
      continue;
    }

    quantityByDurability.set(
      variant.durability,
      (quantityByDurability.get(variant.durability) || 0) + variant.quantity
    );
  }

  const query = `${focusedValue ?? ""}`.trim();
  return Array.from(quantityByDurability.entries())
    .filter(([durability]) => (!query ? true : `${durability}`.startsWith(query)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([durability, quantity]) => ({
      name: `Durabilité ${durability} (${quantity} en stock)`,
      value: durability
    }));
}

function getEnchantmentAutocompleteResults(entry, focusedValue, selectedDurability) {
  const quantityByEnchantment = new Map();
  for (const variant of entry.variants.filter((itemVariant) => matchesDurability(itemVariant, selectedDurability))) {
    if (!variant.enchantment) {
      continue;
    }

    const key = variant.enchantment.toLowerCase();
    if (!quantityByEnchantment.has(key)) {
      quantityByEnchantment.set(key, { label: variant.enchantment, quantity: 0 });
    }

    quantityByEnchantment.get(key).quantity += variant.quantity;
  }

  const normalizedQuery = normalizeForAutocomplete(`${focusedValue ?? ""}`);
  return Array.from(quantityByEnchantment.values())
    .filter((entryData) =>
      !normalizedQuery ? true : normalizeForAutocomplete(entryData.label).includes(normalizedQuery)
    )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 25)
    .map((entryData) => ({
      name: `Enchantement ${entryData.label} (${entryData.quantity} en stock)`,
      value: entryData.label
    }));
}

function buildQuantityCandidates(maxQuantity) {
  if (maxQuantity <= 0) {
    return [];
  }

  if (maxQuantity <= 25) {
    return Array.from({ length: maxQuantity }, (_, index) => index + 1);
  }

  const base = [
    1, 2, 3, 5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 500, 750, 1000, 1500, 2000, 5000, 10000
  ];
  const filtered = base.filter((value) => value <= maxQuantity);
  if (!filtered.includes(maxQuantity)) {
    filtered.push(maxQuantity);
  }
  return filtered;
}

function getQuantityAutocompleteResults(entry, focusedValue, selectedDurability, selectedEnchantment) {
  const matchingVariants = entry.variants.filter(
    (variant) =>
      matchesDurability(variant, selectedDurability) && matchesEnchantment(variant, selectedEnchantment)
  );

  const availableQuantity = matchingVariants.reduce((sum, variant) => sum + variant.quantity, 0);
  if (availableQuantity <= 0) {
    return [];
  }

  const parsedFocused = Number.parseInt(`${focusedValue ?? ""}`.trim(), 10);
  const query = Number.isInteger(parsedFocused) && parsedFocused > 0 ? parsedFocused : null;
  const candidateSet = new Set(buildQuantityCandidates(availableQuantity));

  if (query && query <= availableQuantity) {
    candidateSet.add(query);
    candidateSet.add(Math.min(availableQuantity, query * 2));
    candidateSet.add(Math.min(availableQuantity, query * 5));
  }
  candidateSet.add(availableQuantity);

  return Array.from(candidateSet)
    .filter((value) => (!query ? true : `${value}`.startsWith(`${query}`) || value === availableQuantity))
    .sort((a, b) => a - b)
    .slice(0, 25)
    .map((value) => ({
      name: `Quantité ${value} (max : ${availableQuantity})`,
      value
    }));
}

async function handleAutocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const focusedValue = interaction.options.getFocused();

  if (interaction.commandName === "ajouter-au-stock" && focusedOption.name === "item") {
    await interaction.respond(getAllItemAutocompleteResults(focusedValue));
    return;
  }

  if (interaction.commandName === "retirer-du-stock") {
    if (focusedOption.name === "item") {
      await interaction.respond(await getStockItemAutocompleteResults(focusedValue));
      return;
    }

    const selectedItemId = interaction.options.getString("item");
    if (!selectedItemId) {
      await interaction.respond([]);
      return;
    }

    const stockView = await getStockView();
    const selectedEntry = stockView.entries.find((entry) => entry.itemId === selectedItemId);
    if (!selectedEntry) {
      await interaction.respond([]);
      return;
    }

    if (focusedOption.name === "durabilite") {
      await interaction.respond(getDurabilityAutocompleteResults(selectedEntry, focusedValue));
      return;
    }

    if (focusedOption.name === "enchantement") {
      const selectedDurability = interaction.options.getInteger("durabilite");
      await interaction.respond(
        getEnchantmentAutocompleteResults(selectedEntry, focusedValue, selectedDurability)
      );
      return;
    }

    if (focusedOption.name === "quantite") {
      const selectedDurability = interaction.options.getInteger("durabilite");
      const selectedEnchantment = interaction.options.getString("enchantement");
      await interaction.respond(
        getQuantityAutocompleteResults(
          selectedEntry,
          focusedValue,
          selectedDurability,
          selectedEnchantment
        )
      );
      return;
    }
  }

  if (
    ["fiche-item", "reset-item"].includes(interaction.commandName) &&
    focusedOption.name === "item"
  ) {
    await interaction.respond(await getStockItemAutocompleteResults(focusedValue));
    return;
  }

  await interaction.respond([]);
}

async function handleAdd(interaction) {
  if (!(await ensureActionPermission(interaction, "add"))) {
    return;
  }

  try {
    const result = await addToStock(buildMutationPayload(interaction));
    await interaction.reply({
      embeds: [createSuccessEmbed(result, "add", interaction.user.tag)],
      ephemeral: true
    });
    await publishLog(interaction, result);
  } catch (error) {
    await interaction.reply({
      embeds: [createErrorEmbed(error.message || "Une erreur est survenue pendant l'ajout.")],
      ephemeral: true
    });
  }
}

async function handleRemove(interaction) {
  if (!(await ensureActionPermission(interaction, "remove"))) {
    return;
  }

  try {
    const result = await removeFromStock(buildMutationPayload(interaction));
    await interaction.reply({
      embeds: [createSuccessEmbed(result, "remove", interaction.user.tag)],
      ephemeral: true
    });
    await publishLog(interaction, result);
  } catch (error) {
    await interaction.reply({
      embeds: [createErrorEmbed(error.message || "Une erreur est survenue pendant le retrait.")],
      ephemeral: true
    });
  }
}

async function handleViewStock(interaction) {
  const stockView = await getStockView();
  const pages = buildStockPages(stockView);
  const pageIndex = 0;

  const message = await interaction.reply({
    embeds: [pages[pageIndex].embed],
    components: createButtons(pageIndex, pages.length - 1),
    fetchReply: true
  });

  registerSession(message.id, interaction.user.id, pages);
}

async function handleSearchItem(interaction) {
  const searchResult = await searchStockEntries({
    query: interaction.options.getString("recherche"),
    category: interaction.options.getString("categorie"),
    page: interaction.options.getInteger("page") || 1,
    pageSize: interaction.options.getInteger("par_page") || 8
  });

  await interaction.reply({
    embeds: [createSearchResultsEmbed(searchResult)],
    ephemeral: true
  });
}

async function handleItemSheet(interaction) {
  const itemId = interaction.options.getString("item", true);
  const item = await getItemStockById(itemId);
  if (!item) {
    await interaction.reply({
      embeds: [createErrorEmbed("Cet objet est absent du stock.")],
      ephemeral: true
    });
    return;
  }

  await interaction.reply({
    embeds: [createItemSheetEmbed(item)],
    ephemeral: true
  });
}

async function handleHistory(interaction) {
  const historyResult = await getHistoryView({
    action: interaction.options.getString("action"),
    userId: interaction.options.getUser("utilisateur")?.id || null,
    page: interaction.options.getInteger("page") || 1,
    pageSize: interaction.options.getInteger("par_page") || 10
  });

  await interaction.reply({
    embeds: [createHistoryEmbed(historyResult)],
    ephemeral: true
  });
}

async function handleTop(interaction, action) {
  const topResult = await getTopItemsByAction({
    action,
    days: interaction.options.getInteger("jours") || 30,
    limit: interaction.options.getInteger("limite") || 10
  });

  const title = action === "remove" ? "Top consommation" : "Top ajouts";
  await interaction.reply({
    embeds: [createTopEmbed(topResult, title)],
    ephemeral: true
  });
}

async function handleExport(interaction) {
  const format = interaction.options.getString("format") || "json";
  const exportFile = await buildExportFile(format);
  const attachment = new AttachmentBuilder(exportFile.content, {
    name: exportFile.fileName
  });

  await interaction.reply({
    embeds: [createExportEmbed(exportFile.summary, exportFile.fileName)],
    files: [attachment],
    ephemeral: true
  });
}

async function handleResetItem(interaction) {
  if (!(await ensureActionPermission(interaction, "reset"))) {
    return;
  }

  const confirmation = interaction.options.getString("confirmation", true).trim().toUpperCase();
  if (confirmation !== CONFIRMATION_KEYWORD) {
    await interaction.reply({
      embeds: [createErrorEmbed(`Confirmation invalide. Écris exactement \`${CONFIRMATION_KEYWORD}\`.`)],
      ephemeral: true
    });
    return;
  }

  try {
    const result = await resetItemStock({
      itemId: interaction.options.getString("item", true),
      user: { id: interaction.user.id, tag: interaction.user.tag },
      reason: interaction.options.getString("raison")
    });

    await interaction.reply({
      embeds: [createResetSuccessEmbed(result, interaction.user.tag)],
      ephemeral: true
    });
    await publishLog(interaction, result);
  } catch (error) {
    await interaction.reply({
      embeds: [createErrorEmbed(error.message || "Une erreur est survenue pendant la réinitialisation.")],
      ephemeral: true
    });
  }
}

function actionCodeToLabel(actionCode) {
  return PERMISSION_ACTION_NAMES[actionCode] || actionCode;
}

async function handlePermissionsStock(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      embeds: [createErrorEmbed("Cette commande doit être utilisée sur un serveur.")],
      ephemeral: true
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      embeds: [createErrorEmbed("Tu dois avoir la permission `Gérer le serveur` pour utiliser cette commande.")],
      ephemeral: true
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand(true);

  if (subcommand === "voir") {
    const permissions = await getPermissionsConfig();
    await interaction.reply({
      embeds: [createPermissionsEmbed(permissions)],
      ephemeral: true
    });
    return;
  }

  if (subcommand === "ajouter") {
    const action = interaction.options.getString("action", true);
    const role = interaction.options.getRole("role", true);
    const permissions = await addPermissionRole(action, role.id);

    await interaction.reply({
      content: `✅ Rôle ${role} autorisé pour \`${actionCodeToLabel(action)}\`.`,
      embeds: [createPermissionsEmbed(permissions)],
      ephemeral: true
    });
    return;
  }

  if (subcommand === "retirer") {
    const action = interaction.options.getString("action", true);
    const role = interaction.options.getRole("role", true);
    const permissions = await removePermissionRole(action, role.id);

    await interaction.reply({
      content: `✅ Rôle ${role} retiré de \`${actionCodeToLabel(action)}\`.`,
      embeds: [createPermissionsEmbed(permissions)],
      ephemeral: true
    });
    return;
  }

  if (subcommand === "vider") {
    const action = interaction.options.getString("action", true);
    const permissions = await clearPermissionRoles(action);

    await interaction.reply({
      content: `✅ Tous les rôles ont été retirés pour \`${actionCodeToLabel(action)}\`.`,
      embeds: [createPermissionsEmbed(permissions)],
      ephemeral: true
    });
  }
}

async function handleStats(interaction) {
  const days = interaction.options.getInteger("jours") || 7;
  const stats = await getStockStats(days);

  await interaction.reply({
    embeds: [createStatsEmbed(stats)],
    ephemeral: true
  });
}

async function handleHelp(interaction) {
  await interaction.reply({
    embeds: createHelpEmbeds(),
    ephemeral: true
  });
}

async function handleUptime(interaction) {
  const message = await interaction.reply({
    embeds: [createUptimeEmbed(getUptimePayload())],
    components: createUptimeComponents(false),
    fetchReply: true
  });

  registerUptimeSession(message, interaction.user.id);
}

async function handleUptimeButtons(interaction) {
  if (!["uptime_refresh", "uptime_restart"].includes(interaction.customId)) {
    return false;
  }

  const session = uptimeSessions.get(interaction.message.id);
  if (!session) {
    await interaction.reply({
      embeds: [createErrorEmbed("Cette vue d'uptime a expiré. Utilise /uptime pour en créer une nouvelle.")],
      ephemeral: true
    });
    return true;
  }

  extendUptimeSession(session);

  if (interaction.customId === "uptime_refresh") {
    await interaction.update({
      embeds: [createUptimeEmbed(getUptimePayload())],
      components: createUptimeComponents(false)
    });
    return true;
  }

  const canRestart =
    interaction.user.id === session.ownerId ||
    (interaction.inGuild() && interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));

  if (!canRestart) {
    await interaction.reply({
      embeds: [createErrorEmbed("Tu dois être administrateur du serveur pour redémarrer le bot.")],
      ephemeral: true
    });
    return true;
  }

  await interaction.update({
    embeds: [createUptimeRestartingEmbed(interaction.user.tag)],
    components: createUptimeComponents(true)
  });

  clearUptimeSession(interaction.message.id);
  setTimeout(() => restartBotProcess(), 1200);
  return true;
}

async function handleButtons(interaction) {
  if (await handleUptimeButtons(interaction)) {
    return;
  }

  if (
    !["stock_first", "stock_prev", "stock_next", "stock_last", "stock_refresh"].includes(
      interaction.customId
    )
  ) {
    return;
  }

  const session = getSession(interaction.message.id);
  if (!session) {
    await interaction.reply({
      embeds: [createErrorEmbed("Cette pagination a expiré. Utilise /voir-stock pour en générer une nouvelle.")],
      ephemeral: true
    });
    return;
  }

  if (interaction.user.id !== session.userId) {
    await interaction.reply({
      embeds: [createErrorEmbed("Seule la personne ayant ouvert cette vue peut utiliser ces boutons.")],
      ephemeral: true
    });
    return;
  }

  if (interaction.customId === "stock_refresh") {
    const refreshedStock = await getStockView();
    const refreshedPages = buildStockPages(refreshedStock);
    updateSessionPages(interaction.message.id, refreshedPages);
    const active = getSession(interaction.message.id);
    const index = Math.max(0, Math.min(active.pageIndex, active.pages.length - 1));

    await interaction.update({
      embeds: [active.pages[index].embed],
      components: createButtons(index, active.pages.length - 1)
    });
    return;
  }

  if (interaction.customId === "stock_first") {
    session.pageIndex = 0;
  } else if (interaction.customId === "stock_prev") {
    session.pageIndex = Math.max(0, session.pageIndex - 1);
  } else if (interaction.customId === "stock_next") {
    session.pageIndex = Math.min(session.pages.length - 1, session.pageIndex + 1);
  } else if (interaction.customId === "stock_last") {
    session.pageIndex = session.pages.length - 1;
  }

  await interaction.update({
    embeds: [session.pages[session.pageIndex].embed],
    components: createButtons(session.pageIndex, session.pages.length - 1)
  });
}

client.once("ready", async () => {
  console.log(`${client.user.tag} est connecté.`);
  client.user.setActivity({
    name: "🔎 Surveille l'entrepôt.",
    type: ActivityType.Watching
  });

  try {
    const payload = COMMAND_BUILDERS.map((command) => command.toJSON());
    if (process.env.GUILD_ID) {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      await guild.commands.set(payload);
      console.log("Slash commands synchronisées sur le serveur.");
    } else {
      await client.application.commands.set(payload);
      console.log("Slash commands synchronisées globalement.");
    }
  } catch (error) {
    console.error("Erreur de synchronisation des commandes :", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      await handleAutocomplete(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButtons(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName === "ajouter-au-stock") {
      await handleAdd(interaction);
      return;
    }

    if (interaction.commandName === "retirer-du-stock") {
      await handleRemove(interaction);
      return;
    }

    if (interaction.commandName === "voir-stock") {
      await handleViewStock(interaction);
      return;
    }

    if (interaction.commandName === "rechercher-item") {
      await handleSearchItem(interaction);
      return;
    }

    if (interaction.commandName === "fiche-item") {
      await handleItemSheet(interaction);
      return;
    }

    if (interaction.commandName === "historique-stock") {
      await handleHistory(interaction);
      return;
    }

    if (interaction.commandName === "top-consommation") {
      await handleTop(interaction, "remove");
      return;
    }

    if (interaction.commandName === "top-ajouts") {
      await handleTop(interaction, "add");
      return;
    }

    if (interaction.commandName === "export-stock") {
      await handleExport(interaction);
      return;
    }

    if (interaction.commandName === "reset-item") {
      await handleResetItem(interaction);
      return;
    }

    if (interaction.commandName === "permissions-stock") {
      await handlePermissionsStock(interaction);
      return;
    }

    if (interaction.commandName === "stats-stock") {
      await handleStats(interaction);
      return;
    }

    if (interaction.commandName === "uptime") {
      await handleUptime(interaction);
      return;
    }

    if (interaction.commandName === "help") {
      await handleHelp(interaction);
    }
  } catch (error) {
    console.error("Erreur lors du traitement d'une interaction :", error);

    const payload = {
      embeds: [createErrorEmbed("Une erreur inattendue est survenue.")]
    };

    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction
          .followUp({ ...payload, ephemeral: true })
          .catch(() => deleteSession(interaction.message?.id));
      } else {
        await interaction
          .reply({ ...payload, ephemeral: true })
          .catch(() => deleteSession(interaction.message?.id));
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
