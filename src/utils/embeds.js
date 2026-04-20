const { EmbedBuilder } = require("discord.js");

const COLORS = {
  INFO: 0x4f46e5,
  SUCCESS: 0x16a34a,
  WARNING: 0xea580c,
  ERROR: 0xdc2626,
  LOG_ADD: 0x0f766e,
  LOG_REMOVE: 0xb45309,
  LOG_RESET: 0x7c3aed,
  HELP: 0x0369a1
};

const ACTION_LABELS = {
  add: "Ajout",
  remove: "Retrait",
  reset: "Réinitialisation"
};

const CATEGORY_EMOJIS = {
  "Monnaie": "💰",
  "Cannes à pêche": "🎣",
  "Potions": "🧪",
  "Friandises": "🍬",
  "Appâts": "🪱",
  "Coffres": "🧰",
  "Minéraux": "🪨",
  "Poissons et créatures": "🐟",
  "Cœurs": "❤️",
  "Aucune catégorie": "📂"
};

function getCategoryEmoji(category) {
  return CATEGORY_EMOJIS[category] || "📦";
}

function formatOptionalValue(value, fallback = "Non renseigné") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function formatDurability(value) {
  return value === null || value === undefined ? "Non renseignée" : `${value}`;
}

function formatEnchantment(value) {
  return value ? value : "Aucun";
}

function truncateFieldValue(value, max = 1024) {
  if (!value || value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
}

function formatDiscordTimestamp(isoDate) {
  if (!isoDate) {
    return "Inconnue";
  }

  const epoch = Math.floor(new Date(isoDate).getTime() / 1000);
  if (!Number.isFinite(epoch)) {
    return "Inconnue";
  }
  return `<t:${epoch}:f>`;
}

function createErrorEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle("❌ Action impossible")
    .setDescription(`> ${message}`)
    .setTimestamp();
}

function createPermissionDeniedEmbed(action) {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle("🚫 Permission insuffisante")
    .setDescription(
      [
        `Tu n'as pas l'autorisation d'exécuter l'action **${ACTION_LABELS[action] || action}**.`,
        "Utilise `/permissions-stock voir` pour vérifier la configuration."
      ].join("\n")
    )
    .setTimestamp();
}

function createSuccessEmbed(result, actionLabel, actorTag) {
  const isAdd = actionLabel === "add";
  const title = isAdd ? "✅ Ajout confirmé" : "⚠️ Retrait confirmé";
  const color = isAdd ? COLORS.SUCCESS : COLORS.WARNING;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      [
        `**${result.item.name}** a été mis à jour avec succès.`,
        "",
        `${getCategoryEmoji(result.category)} **Catégorie :** ${result.category}`
      ].join("\n")
    )
    .addFields(
      { name: "📥 Quantité traitée", value: `\`${result.quantity}\``, inline: true },
      { name: "🛡️ Durabilité", value: `\`${formatDurability(result.durability)}\``, inline: true },
      { name: "✨ Enchantement", value: `\`${formatEnchantment(result.enchantment)}\``, inline: true },
      { name: "📦 Stock total de cet objet", value: `\`${result.totalQuantity}\``, inline: false }
    )
    .setFooter({
      text: `Action réalisée par ${formatOptionalValue(actorTag, "Utilisateur inconnu")}`
    })
    .setTimestamp();

  if (!isAdd && Array.isArray(result.removals) && result.removals.length > 0) {
    const details = result.removals
      .map(
        (entry, index) =>
          `${index + 1}. \`${entry.quantity}\` | 🛡️ ${formatDurability(entry.durability)} | ✨ ${formatEnchantment(entry.enchantment)}`
      )
      .join("\n");

    embed.addFields({
      name: "🧾 Détail du retrait",
      value: truncateFieldValue(details)
    });
  }

  return embed;
}

function createResetSuccessEmbed(result, actorTag) {
  return new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle("🧹 Réinitialisation effectuée")
    .setDescription(
      [
        `L'objet **${result.item.name}** a été retiré complètement du stock.`,
        `${getCategoryEmoji(result.category)} **Catégorie :** ${result.category}`
      ].join("\n")
    )
    .addFields(
      { name: "📤 Quantité supprimée", value: `\`${result.quantity}\``, inline: true },
      { name: "🧩 Variantes supprimées", value: `\`${result.removals?.length || 0}\``, inline: true },
      { name: "📝 Raison", value: result.reason || "Non renseignée", inline: false }
    )
    .setFooter({
      text: `Action réalisée par ${formatOptionalValue(actorTag, "Utilisateur inconnu")}`
    })
    .setTimestamp();
}

function createStockItemField(entry) {
  const previewVariants = entry.variants.slice(0, 3);
  const hiddenVariantsCount = Math.max(0, entry.variants.length - previewVariants.length);

  const variantLines = previewVariants.map(
    (variant) =>
      `• \`${variant.quantity}\` | 🛡️ ${formatDurability(variant.durability)} | ✨ ${formatEnchantment(variant.enchantment)}`
  );

  if (hiddenVariantsCount > 0) {
    variantLines.push(`• ... et \`${hiddenVariantsCount}\` autre(s) variante(s)`);
  }

  const value = [
    `📦 **Quantité totale :** \`${entry.totalQuantity}\``,
    `🧩 **Variantes :** \`${entry.variants.length}\``,
    "",
    variantLines.length ? variantLines.join("\n") : "• Aucune variante enregistrée"
  ].join("\n");

  return {
    name: `${getCategoryEmoji(entry.category)} ${entry.itemName}`,
    value: truncateFieldValue(value),
    inline: false
  };
}

function createStockPageEmbed(pageData) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle("📦 Vue du stock")
    .setDescription(
      [
        `${getCategoryEmoji(pageData.category)} **Catégorie :** ${pageData.category}`,
        `📚 **Références totales :** \`${pageData.totalReferences}\``,
        `🧮 **Unités totales :** \`${pageData.totalUnits}\``,
        "",
        "Utilise les boutons pour naviguer et actualiser l'affichage."
      ].join("\n")
    )
    .setFooter({
      text: `Page ${pageData.globalPage}/${pageData.globalTotalPages} • Catégorie ${pageData.localPage}/${pageData.localTotalPages}`
    })
    .setTimestamp();

  if (pageData.entries.length === 0) {
    embed.addFields({
      name: "📭 Aucun objet",
      value: "Cette catégorie ne contient actuellement aucun objet."
    });
    return embed;
  }

  embed.addFields(pageData.entries.map(createStockItemField));
  return embed;
}

function createEmptyStockEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle("📭 Stock vide")
    .setDescription(
      [
        "Aucun objet n'est enregistré pour le moment.",
        "Ajoute des éléments avec `/ajouter-au-stock` pour commencer."
      ].join("\n")
    )
    .setTimestamp();
}

function createSearchResultsEmbed(searchResult) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle("🔎 Résultats de recherche")
    .setDescription(
      [
        `Recherche : \`${searchResult.query || "Toutes les références"}\``,
        `Catégorie : \`${searchResult.category || "Toutes"}\``,
        `Résultats : \`${searchResult.total}\` référence(s)`,
        `Unités cumulées : \`${searchResult.totalUnits}\``
      ].join("\n")
    )
    .setFooter({
      text: `Page ${searchResult.currentPage}/${searchResult.totalPages}`
    })
    .setTimestamp();

  if (!searchResult.entries.length) {
    embed.addFields({
      name: "Aucun résultat",
      value: "Aucun objet ne correspond à cette recherche."
    });
    return embed;
  }

  embed.addFields(searchResult.entries.map(createStockItemField));
  return embed;
}

function createItemSheetEmbed(entry) {
  const variants = entry.variants
    .map(
      (variant, index) =>
        `${index + 1}. \`${variant.quantity}\` | 🛡️ ${formatDurability(variant.durability)} | ✨ ${formatEnchantment(variant.enchantment)}`
    )
    .join("\n");

  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`📘 Fiche item • ${entry.itemName}`)
    .setDescription(
      [
        `${getCategoryEmoji(entry.category)} **Catégorie :** ${entry.category}`,
        `📦 **Quantité totale :** \`${entry.totalQuantity}\``,
        `🧩 **Variantes :** \`${entry.variants.length}\``,
        `🕒 **Dernière mise à jour :** ${formatDiscordTimestamp(entry.updatedAt)}`
      ].join("\n")
    )
    .addFields({
      name: "Détail des variantes",
      value: truncateFieldValue(variants || "Aucune variante enregistrée")
    })
    .setTimestamp();
}

function createHistoryEmbed(historyResult) {
  const filters = [];
  if (historyResult.action) {
    filters.push(`Action : ${ACTION_LABELS[historyResult.action] || historyResult.action}`);
  }
  if (historyResult.userId) {
    filters.push(`Utilisateur : <@${historyResult.userId}>`);
  }

  const lines = historyResult.entries.map((entry, index) => {
    const absoluteIndex = (historyResult.currentPage - 1) * historyResult.pageSize + index + 1;
    const user = entry.userId ? `<@${entry.userId}>` : "Inconnu";
    return [
      `**#${absoluteIndex} • ${ACTION_LABELS[entry.action] || entry.action}**`,
      `Objet : \`${entry.itemName}\` • Qté : \`${entry.quantity || 0}\` • Par : ${user}`,
      `Date : ${formatDiscordTimestamp(entry.timestamp)}`
    ].join("\n");
  });

  const description = [
    filters.length ? filters.join(" • ") : "Aucun filtre appliqué.",
    `Total d'entrées : \`${historyResult.total}\``,
    "",
    lines.length ? lines.join("\n\n") : "Aucune entrée disponible."
  ].join("\n");

  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle("🕘 Historique du stock")
    .setDescription(truncateFieldValue(description, 4000))
    .setFooter({
      text: `Page ${historyResult.currentPage}/${historyResult.totalPages}`
    })
    .setTimestamp();
}

function createTopEmbed(topResult, title) {
  const lines = topResult.top.map(
    (entry, index) =>
      `**${index + 1}.** ${getCategoryEmoji(entry.category)} ${entry.itemName} • \`${entry.quantity}\` unités • \`${entry.events}\` action(s)`
  );

  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(title)
    .setDescription(
      [
        `Période : \`${topResult.days}\` jour(s)`,
        `Items suivis : \`${topResult.totalTrackedItems}\``,
        "",
        lines.length ? lines.join("\n") : "Aucune donnée pour cette période."
      ].join("\n")
    )
    .setTimestamp();
}

function createExportEmbed(exportSummary, fileName) {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle("📤 Export terminé")
    .setDescription(
      [
        `Fichier généré : \`${fileName}\``,
        `Format : \`${exportSummary.format.toUpperCase()}\``,
        `Références exportées : \`${exportSummary.references}\``,
        `Unités exportées : \`${exportSummary.units}\``
      ].join("\n")
    )
    .setTimestamp();
}

function createPermissionsEmbed(config) {
  const formatRoles = (roleIds) =>
    truncateFieldValue(
      roleIds.length ? roleIds.map((roleId) => `<@&${roleId}>`).join(", ") : "Tout le monde"
    );

  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle("🔐 Permissions du stock")
    .setDescription("Configuration des rôles autorisés par action sensible.")
    .addFields(
      { name: "➕ Ajouter au stock", value: formatRoles(config.add || []), inline: false },
      { name: "➖ Retirer du stock", value: formatRoles(config.remove || []), inline: false },
      { name: "🧹 Réinitialiser un item", value: formatRoles(config.reset || []), inline: false }
    )
    .setTimestamp();
}

function createStatsEmbed(stats) {
  const categoriesPreview = stats.categories
    .slice(0, 6)
    .map(
      (category) =>
        `${getCategoryEmoji(category.name)} ${category.name} : \`${category.units}\` unité(s), \`${category.references}\` réf(s)`
    )
    .join("\n");

  const topItemLine = stats.topItem
    ? `${getCategoryEmoji(stats.topItem.category)} ${stats.topItem.itemName} (\`${stats.topItem.totalQuantity}\`)`
    : "Aucun";
  const bottomItemLine = stats.bottomItem
    ? `${getCategoryEmoji(stats.bottomItem.category)} ${stats.bottomItem.itemName} (\`${stats.bottomItem.totalQuantity}\`)`
    : "Aucun";

  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle("📊 Statistiques du stock")
    .setDescription(
      [
        `Références actives : \`${stats.totals.references}\``,
        `Unités totales : \`${stats.totals.units}\``,
        `Catégories actives : \`${stats.totals.categories}\``,
        `Dernière action : ${stats.lastAction ? formatDiscordTimestamp(stats.lastAction.timestamp) : "Aucune"}`
      ].join("\n")
    )
    .addFields(
      {
        name: `📈 Tendance (${stats.days} jour(s))`,
        value: [
          `Événements : \`${stats.trend.events}\``,
          `Ajouts : \`${stats.trend.addEvents}\` (\`${stats.trend.addedUnits}\` unités)`,
          `Retraits : \`${stats.trend.removeEvents}\` (\`${stats.trend.removedUnits}\` unités)`,
          `Réinitialisations : \`${stats.trend.resetEvents}\` (\`${stats.trend.resetUnits}\` unités)`
        ].join("\n"),
        inline: false
      },
      {
        name: "🏆 Extrêmes du stock",
        value: [
          `Plus stocké : ${topItemLine}`,
          `Moins stocké : ${bottomItemLine}`
        ].join("\n"),
        inline: false
      },
      {
        name: "🗂️ Répartition par catégorie",
        value: categoriesPreview || "Aucune catégorie active.",
        inline: false
      }
    )
    .setTimestamp();
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function createUptimeEmbed(payload) {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle("🟢 État du bot en direct")
    .setDescription(
      [
        `⏱️ **En ligne depuis :** <t:${payload.startedAtEpoch}:f>`,
        `🔄 **Durée :** <t:${payload.startedAtEpoch}:R>`,
        "",
        `📡 **Latence WebSocket :** \`${payload.wsPingMs} ms\``,
        `🧠 **Temps de traitement :** \`${payload.processUptimeMs} ms\``,
        `🏢 **Hébergeur :** \`${payload.hostProvider}\``,
        `🖥️ **Machine :** \`${payload.hostName}\``,
        `⚙️ **Node.js :** \`${payload.nodeVersion}\``,
        `📦 **Mémoire utilisée :** \`${formatNumber(payload.memoryMb)} Mo\``
      ].join("\n")
    )
    .setFooter({
      text: "Mise à jour automatique toutes les 5 secondes."
    })
    .setTimestamp();
}

function createUptimeRestartingEmbed(actorTag) {
  return new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle("🔄 Redémarrage du bot")
    .setDescription(
      [
        `Le redémarrage a été demandé par **${actorTag}**.`,
        "Le bot revient automatiquement dans quelques instants."
      ].join("\n")
    )
    .setTimestamp();
}

function createLogEmbed(result, actor) {
  const isAdd = result.action === "add";
  const isRemove = result.action === "remove";
  const color = isAdd ? COLORS.LOG_ADD : isRemove ? COLORS.LOG_REMOVE : COLORS.LOG_RESET;
  const title = isAdd
    ? "🟢 Journal de stock - Ajout"
    : isRemove
      ? "🟠 Journal de stock - Retrait"
      : "🟣 Journal de stock - Réinitialisation";

  const logEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(`👤 **Action réalisée par :** ${actor}`)
    .addFields(
      { name: "📦 Objet", value: result.item.name, inline: true },
      { name: "🏷️ Catégorie", value: result.category, inline: true },
      { name: "🔢 Quantité", value: `\`${result.quantity}\``, inline: true },
      { name: "🛡️ Durabilité", value: `\`${formatDurability(result.durability)}\``, inline: true },
      { name: "✨ Enchantement", value: `\`${formatEnchantment(result.enchantment)}\``, inline: true },
      { name: "📊 Stock restant", value: `\`${result.totalQuantity}\``, inline: true }
    )
    .setTimestamp();

  if (result.reason) {
    logEmbed.addFields({ name: "📝 Raison", value: result.reason, inline: false });
  }

  if (Array.isArray(result.removals) && result.removals.length > 0) {
    const distribution = result.removals
      .map(
        (entry, index) =>
          `${index + 1}. \`${entry.quantity}\` | 🛡️ ${formatDurability(entry.durability)} | ✨ ${formatEnchantment(entry.enchantment)}`
      )
      .join("\n");

    logEmbed.addFields({
      name: isRemove ? "🧾 Répartition du retrait" : "🧾 Variantes impactées",
      value: truncateFieldValue(distribution)
    });
  }

  return logEmbed;
}

function createHelpEmbeds() {
  const overviewEmbed = new EmbedBuilder()
    .setColor(COLORS.HELP)
    .setTitle("📘 Centre d'aide • Gestion du stock")
    .setDescription(
      [
        "Panneau de référence du bot de stock.",
        "",
        "⚡ **Démarrage rapide**",
        "1. `/ajouter-au-stock`",
        "2. `/retirer-du-stock`",
        "3. `/voir-stock`"
      ].join("\n")
    )
    .addFields(
      {
        name: "🧠 Autocomplétion intelligente",
        value: [
          "• Item retiré : uniquement les objets disponibles.",
          "• Durabilité / enchantement : uniquement les variantes en stock.",
          "• Quantité : suggestions basées sur le stock réel."
        ].join("\n"),
        inline: false
      },
      {
        name: "🔐 Sécurité",
        value: "Configure les droits avec `/permissions-stock` pour protéger ajout, retrait et réinitialisation.",
        inline: false
      }
    )
    .setTimestamp();

  const stockCommandsEmbed = new EmbedBuilder()
    .setColor(COLORS.HELP)
    .setTitle("🧰 Commandes stock")
    .addFields(
      { name: "➕ `/ajouter-au-stock`", value: "Ajoute un item avec options quantité, durabilité et enchantement.", inline: false },
      { name: "➖ `/retirer-du-stock`", value: "Retire un item avec filtrage intelligent des variantes.", inline: false },
      { name: "📦 `/voir-stock`", value: "Affiche le stock paginé par catégorie.", inline: false },
      { name: "🔎 `/rechercher-item`", value: "Recherche par nom, catégorie et pagination.", inline: false },
      { name: "📘 `/fiche-item`", value: "Fiche détaillée d'un item (quantités + variantes).", inline: false },
      { name: "🧹 `/reset-item`", value: "Supprime totalement un item du stock (commande sensible).", inline: false }
    )
    .setTimestamp();

  const analyticsEmbed = new EmbedBuilder()
    .setColor(COLORS.HELP)
    .setTitle("📊 Commandes analyse et admin")
    .addFields(
      { name: "🕘 `/historique-stock`", value: "Historique filtré (action, utilisateur, page).", inline: false },
      { name: "🏆 `/top-consommation`", value: "Classement des items les plus retirés.", inline: false },
      { name: "🚀 `/top-ajouts`", value: "Classement des items les plus ajoutés.", inline: false },
      { name: "📤 `/export-stock`", value: "Exporte le stock en JSON ou CSV.", inline: false },
      { name: "📈 `/stats-stock`", value: "Vue statistique complète (totaux, tendances, catégories).", inline: false },
      { name: "⏱️ `/uptime`", value: "Affiche l'état du bot en direct et son hébergeur.", inline: false },
      { name: "🔐 `/permissions-stock`", value: "Gestion des rôles autorisés sur les commandes sensibles.", inline: false },
      { name: "🆘 `/help`", value: "Affiche ce centre d'aide.", inline: false }
    )
    .setFooter({ text: "Conseil : lance /help après chaque mise à jour du bot." })
    .setTimestamp();

  return [overviewEmbed, stockCommandsEmbed, analyticsEmbed];
}

module.exports = {
  createErrorEmbed,
  createPermissionDeniedEmbed,
  createSuccessEmbed,
  createResetSuccessEmbed,
  createStockPageEmbed,
  createEmptyStockEmbed,
  createSearchResultsEmbed,
  createItemSheetEmbed,
  createHistoryEmbed,
  createTopEmbed,
  createExportEmbed,
  createPermissionsEmbed,
  createStatsEmbed,
  createUptimeEmbed,
  createUptimeRestartingEmbed,
  createLogEmbed,
  createHelpEmbeds
};
