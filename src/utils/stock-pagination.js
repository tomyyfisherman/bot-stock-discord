const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { createEmptyStockEmbed, createStockPageEmbed } = require("./embeds");

const ITEMS_PER_PAGE = 6;
const SESSION_TTL_MS = 15 * 60 * 1000;
const sessions = new Map();

function chunkEntries(entries, chunkSize) {
  const chunks = [];
  for (let index = 0; index < entries.length; index += chunkSize) {
    chunks.push(entries.slice(index, index + chunkSize));
  }
  return chunks;
}

function buildStockPages(stockView) {
  if (!stockView.entries.length) {
    return [{ embed: createEmptyStockEmbed(), meta: { category: "Aucune catégorie" } }];
  }

  const grouped = new Map();
  for (const entry of stockView.entries) {
    if (!grouped.has(entry.category)) {
      grouped.set(entry.category, []);
    }
    grouped.get(entry.category).push(entry);
  }

  const pageBlueprints = [];
  for (const [category, entries] of grouped.entries()) {
    const chunks = chunkEntries(entries, ITEMS_PER_PAGE);
    chunks.forEach((chunk, index) => {
      pageBlueprints.push({
        category,
        localPage: index + 1,
        localTotalPages: chunks.length,
        entries: chunk
      });
    });
  }

  return pageBlueprints.map((blueprint, index) => ({
    embed: createStockPageEmbed({
      category: blueprint.category,
      entries: blueprint.entries,
      localPage: blueprint.localPage,
      localTotalPages: blueprint.localTotalPages,
      globalPage: index + 1,
      globalTotalPages: pageBlueprints.length,
      totalReferences: stockView.totalReferences,
      totalUnits: stockView.totalUnits
    }),
    meta: blueprint
  }));
}

function createButtons(pageIndex, maxPageIndex) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("stock_first")
        .setLabel("⏮️ Début")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex <= 0),
      new ButtonBuilder()
        .setCustomId("stock_prev")
        .setLabel("◀️ Précédent")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex <= 0),
      new ButtonBuilder()
        .setCustomId("stock_refresh")
        .setLabel("🔄 Actualiser")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("stock_next")
        .setLabel("Suivant ▶️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex >= maxPageIndex),
      new ButtonBuilder()
        .setCustomId("stock_last")
        .setLabel("Fin ⏭️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex >= maxPageIndex)
    )
  ];
}

function registerSession(messageId, userId, pages) {
  sessions.set(messageId, {
    userId,
    pages,
    pageIndex: 0,
    expiresAt: Date.now() + SESSION_TTL_MS
  });

  const timeout = setTimeout(() => sessions.delete(messageId), SESSION_TTL_MS);
  timeout.unref();
}

function getSession(messageId) {
  const session = sessions.get(messageId);
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(messageId);
    return null;
  }

  return session;
}

function updateSessionPages(messageId, pages) {
  const session = sessions.get(messageId);
  if (!session) {
    return null;
  }

  session.pages = pages;
  if (session.pageIndex >= pages.length) {
    session.pageIndex = pages.length - 1;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

function deleteSession(messageId) {
  sessions.delete(messageId);
}

module.exports = {
  buildStockPages,
  createButtons,
  registerSession,
  getSession,
  updateSessionPages,
  deleteSession
};
