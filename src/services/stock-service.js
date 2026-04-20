const { ITEM_BY_ID } = require("../constants/items");
const { getSnapshot, withMutation } = require("./database");

const HISTORY_LIMIT = 5000;
const PERMISSION_ACTIONS = ["add", "remove", "reset"];

function cleanOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeText(value) {
  return `${value ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildVariantKey(durability, enchantment) {
  const durabilityToken = Number.isInteger(durability) ? `d:${durability}` : "d:none";
  const enchantmentToken = enchantment ? `e:${enchantment.toLowerCase()}` : "e:none";
  return `${durabilityToken}|${enchantmentToken}`;
}

function createVariantEntry(durability, enchantment) {
  return {
    durability: Number.isInteger(durability) ? durability : null,
    enchantment: enchantment || null,
    quantity: 0,
    updatedAt: null
  };
}

function normalizeMutationPayload(payload) {
  const item = ITEM_BY_ID.get(payload.itemId);
  if (!item) {
    throw new Error("Objet introuvable.");
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity <= 0) {
    throw new Error("La quantit\u00E9 doit \u00EAtre un entier strictement positif.");
  }

  return {
    item,
    quantity: payload.quantity,
    durability: Number.isInteger(payload.durability) ? payload.durability : null,
    enchantment: cleanOptionalString(payload.enchantment),
    user: payload.user || null
  };
}

function ensureItemRecord(database, item) {
  if (!database.stock[item.id]) {
    database.stock[item.id] = {
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      totalQuantity: 0,
      variants: {},
      updatedAt: null
    };
  }

  return database.stock[item.id];
}

function appendHistory(database, entry) {
  database.history.unshift(entry);
  if (database.history.length > HISTORY_LIMIT) {
    database.history = database.history.slice(0, HISTORY_LIMIT);
  }
}

function ensurePermissionsRecord(database) {
  if (!database.permissions || typeof database.permissions !== "object") {
    database.permissions = {
      add: [],
      remove: [],
      reset: []
    };
  }

  for (const key of PERMISSION_ACTIONS) {
    if (!Array.isArray(database.permissions[key])) {
      database.permissions[key] = [];
    }
    database.permissions[key] = Array.from(
      new Set(database.permissions[key].filter((roleId) => typeof roleId === "string"))
    );
  }
}

function assertPermissionAction(action) {
  if (!PERMISSION_ACTIONS.includes(action)) {
    throw new Error("Action de permission inconnue.");
  }
}

function clonePermissionsFromDatabase(database) {
  ensurePermissionsRecord(database);
  return {
    add: [...database.permissions.add],
    remove: [...database.permissions.remove],
    reset: [...database.permissions.reset]
  };
}

async function addToStock(payload) {
  const normalized = normalizeMutationPayload(payload);
  const now = new Date().toISOString();

  return withMutation(async (database) => {
    ensurePermissionsRecord(database);
    const record = ensureItemRecord(database, normalized.item);
    const variantKey = buildVariantKey(normalized.durability, normalized.enchantment);
    if (!record.variants[variantKey]) {
      record.variants[variantKey] = createVariantEntry(normalized.durability, normalized.enchantment);
    }

    const variant = record.variants[variantKey];
    variant.quantity += normalized.quantity;
    variant.updatedAt = now;

    record.totalQuantity += normalized.quantity;
    record.updatedAt = now;

    appendHistory(database, {
      action: "add",
      itemId: normalized.item.id,
      itemName: normalized.item.name,
      quantity: normalized.quantity,
      durability: normalized.durability,
      enchantment: normalized.enchantment,
      userId: normalized.user?.id || null,
      username: normalized.user?.tag || null,
      timestamp: now,
      totalQuantityAfter: record.totalQuantity
    });

    return {
      action: "add",
      item: normalized.item,
      quantity: normalized.quantity,
      durability: normalized.durability,
      enchantment: normalized.enchantment,
      totalQuantity: record.totalQuantity,
      category: normalized.item.category
    };
  });
}

function matchVariant(variant, durability, enchantment) {
  const durabilityMatches = durability === null || variant.durability === durability;
  const enchantmentMatches =
    enchantment === null || (variant.enchantment || "").toLowerCase() === enchantment.toLowerCase();
  return durabilityMatches && enchantmentMatches;
}

async function removeFromStock(payload) {
  const normalized = normalizeMutationPayload(payload);
  const now = new Date().toISOString();

  return withMutation(async (database) => {
    ensurePermissionsRecord(database);
    const record = database.stock[normalized.item.id];

    if (!record || record.totalQuantity <= 0) {
      throw new Error("Cet objet n'est pas disponible dans le stock.");
    }

    const variants = Object.entries(record.variants)
      .map(([variantKey, variant]) => ({ variantKey, variant }))
      .filter(({ variant }) => matchVariant(variant, normalized.durability, normalized.enchantment))
      .sort((a, b) => b.variant.quantity - a.variant.quantity);

    if (variants.length === 0) {
      throw new Error("Aucune variante ne correspond aux filtres fournis.");
    }

    const totalAvailable = variants.reduce((acc, current) => acc + current.variant.quantity, 0);
    if (totalAvailable < normalized.quantity) {
      throw new Error(`Stock insuffisant: ${totalAvailable} disponible(s) pour cette s\u00E9lection.`);
    }

    let remaining = normalized.quantity;
    const removals = [];

    for (const entry of variants) {
      if (remaining <= 0) {
        break;
      }

      const removable = Math.min(remaining, entry.variant.quantity);
      if (removable <= 0) {
        continue;
      }

      entry.variant.quantity -= removable;
      entry.variant.updatedAt = now;
      remaining -= removable;

      removals.push({
        quantity: removable,
        durability: entry.variant.durability,
        enchantment: entry.variant.enchantment
      });

      if (entry.variant.quantity === 0) {
        delete record.variants[entry.variantKey];
      }
    }

    record.totalQuantity -= normalized.quantity;
    record.updatedAt = now;

    if (record.totalQuantity <= 0) {
      delete database.stock[normalized.item.id];
    }

    appendHistory(database, {
      action: "remove",
      itemId: normalized.item.id,
      itemName: normalized.item.name,
      quantity: normalized.quantity,
      durability: normalized.durability,
      enchantment: normalized.enchantment,
      userId: normalized.user?.id || null,
      username: normalized.user?.tag || null,
      timestamp: now,
      totalQuantityAfter: Math.max(record.totalQuantity, 0),
      removals
    });

    return {
      action: "remove",
      item: normalized.item,
      quantity: normalized.quantity,
      durability: normalized.durability,
      enchantment: normalized.enchantment,
      totalQuantity: Math.max(record.totalQuantity, 0),
      category: normalized.item.category,
      removals
    };
  });
}

function sortByCategoryAndName(entries) {
  return entries.sort((a, b) => {
    const categoryComparison = a.category.localeCompare(b.category, "fr", { sensitivity: "base" });
    if (categoryComparison !== 0) {
      return categoryComparison;
    }
    return a.itemName.localeCompare(b.itemName, "fr", { sensitivity: "base" });
  });
}

function buildVariantSummary(variants) {
  return Object.values(variants)
    .sort((a, b) => b.quantity - a.quantity)
    .map((variant) => ({
      quantity: variant.quantity,
      durability: variant.durability,
      enchantment: variant.enchantment
    }));
}

async function getStockView() {
  const snapshot = await getSnapshot();
  const entries = Object.values(snapshot.stock)
    .map((record) => ({
      itemId: record.itemId,
      itemName: record.itemName,
      category: record.category,
      totalQuantity: record.totalQuantity,
      variants: buildVariantSummary(record.variants),
      updatedAt: record.updatedAt
    }))
    .filter((entry) => entry.totalQuantity > 0);

  return {
    entries: sortByCategoryAndName(entries),
    totalReferences: entries.length,
    totalUnits: entries.reduce((acc, entry) => acc + entry.totalQuantity, 0)
  };
}

async function searchStockEntries({ query, category, page = 1, pageSize = 10 }) {
  const stockView = await getStockView();
  const normalizedQuery = normalizeText(query);
  const safePageSize = Math.max(1, Math.min(pageSize, 20));

  const filtered = stockView.entries.filter((entry) => {
    if (category && entry.category !== category) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      normalizeText(entry.itemName).includes(normalizedQuery) ||
      normalizeText(entry.itemId).includes(normalizedQuery)
    );
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * safePageSize;
  const entries = filtered.slice(start, start + safePageSize);

  return {
    query: query || "",
    category: category || null,
    total,
    totalPages,
    currentPage,
    pageSize: safePageSize,
    entries,
    totalUnits: filtered.reduce((acc, entry) => acc + entry.totalQuantity, 0)
  };
}

async function getItemStockById(itemId) {
  const snapshot = await getSnapshot();
  const record = snapshot.stock[itemId];
  if (!record || record.totalQuantity <= 0) {
    return null;
  }

  return {
    itemId: record.itemId,
    itemName: record.itemName,
    category: record.category,
    totalQuantity: record.totalQuantity,
    variants: buildVariantSummary(record.variants),
    updatedAt: record.updatedAt
  };
}

async function getHistoryView({ page = 1, pageSize = 10, action = null, userId = null }) {
  const snapshot = await getSnapshot();
  const safePageSize = Math.max(5, Math.min(pageSize, 20));

  const filtered = snapshot.history.filter((entry) => {
    if (action && entry.action !== action) {
      return false;
    }
    if (userId && entry.userId !== userId) {
      return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * safePageSize;
  const entries = filtered.slice(start, start + safePageSize);

  return {
    total,
    totalPages,
    currentPage,
    pageSize: safePageSize,
    action,
    userId,
    entries
  };
}

async function getTopItemsByAction({ action, days = 30, limit = 10 }) {
  if (!["add", "remove"].includes(action)) {
    throw new Error("Action invalide pour le classement.");
  }

  const snapshot = await getSnapshot();
  const safeDays = Math.max(1, Math.min(days, 3650));
  const safeLimit = Math.max(1, Math.min(limit, 25));
  const cutoff = Date.now() - safeDays * 24 * 60 * 60 * 1000;

  const map = new Map();
  for (const entry of snapshot.history) {
    if (entry.action !== action) {
      continue;
    }
    if (!entry.timestamp) {
      continue;
    }
    if (new Date(entry.timestamp).getTime() < cutoff) {
      continue;
    }

    if (!map.has(entry.itemId)) {
      const itemMeta = ITEM_BY_ID.get(entry.itemId);
      map.set(entry.itemId, {
        itemId: entry.itemId,
        itemName: entry.itemName || itemMeta?.name || entry.itemId,
        category: itemMeta?.category || "Inconnue",
        quantity: 0,
        events: 0
      });
    }

    const aggregate = map.get(entry.itemId);
    aggregate.quantity += entry.quantity || 0;
    aggregate.events += 1;
  }

  const top = Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, safeLimit);

  return {
    action,
    days: safeDays,
    limit: safeLimit,
    totalTrackedItems: map.size,
    top
  };
}

function escapeCsvCell(value) {
  const cell = `${value ?? ""}`;
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

async function buildExportFile(format) {
  const stockView = await getStockView();
  const generatedAt = new Date().toISOString();

  if (format === "csv") {
    const header = [
      "item_id",
      "item",
      "categorie",
      "quantite_totale",
      "quantite_variante",
      "durabilite",
      "enchantement",
      "mis_a_jour"
    ];
    const lines = [header.join(",")];

    for (const entry of stockView.entries) {
      if (!entry.variants.length) {
        lines.push(
          [
            entry.itemId,
            entry.itemName,
            entry.category,
            entry.totalQuantity,
            "",
            "",
            "",
            entry.updatedAt || ""
          ]
            .map(escapeCsvCell)
            .join(",")
        );
        continue;
      }

      for (const variant of entry.variants) {
        lines.push(
          [
            entry.itemId,
            entry.itemName,
            entry.category,
            entry.totalQuantity,
            variant.quantity,
            variant.durability ?? "",
            variant.enchantment ?? "",
            entry.updatedAt || ""
          ]
            .map(escapeCsvCell)
            .join(",")
        );
      }
    }

    const content = lines.join("\n");
    return {
      fileName: `stock-export-${generatedAt.slice(0, 10)}.csv`,
      mimeType: "text/csv",
      content: Buffer.from(content, "utf8"),
      summary: {
        format: "csv",
        references: stockView.totalReferences,
        units: stockView.totalUnits
      }
    };
  }

  const payload = {
    metadata: {
      generatedAt,
      totalReferences: stockView.totalReferences,
      totalUnits: stockView.totalUnits
    },
    stock: stockView.entries
  };

  return {
    fileName: `stock-export-${generatedAt.slice(0, 10)}.json`,
    mimeType: "application/json",
    content: Buffer.from(JSON.stringify(payload, null, 2), "utf8"),
    summary: {
      format: "json",
      references: stockView.totalReferences,
      units: stockView.totalUnits
    }
  };
}

async function resetItemStock({ itemId, user, reason = null }) {
  const item = ITEM_BY_ID.get(itemId);
  if (!item) {
    throw new Error("Objet introuvable.");
  }

  const now = new Date().toISOString();

  return withMutation(async (database) => {
    ensurePermissionsRecord(database);
    const record = database.stock[itemId];
    if (!record || record.totalQuantity <= 0) {
      throw new Error("Cet objet n'est pas disponible dans le stock.");
    }

    const removedQuantity = record.totalQuantity;
    const removedVariants = buildVariantSummary(record.variants);
    delete database.stock[itemId];

    appendHistory(database, {
      action: "reset",
      itemId: item.id,
      itemName: item.name,
      quantity: removedQuantity,
      durability: null,
      enchantment: null,
      userId: user?.id || null,
      username: user?.tag || null,
      timestamp: now,
      totalQuantityAfter: 0,
      removals: removedVariants,
      reason: cleanOptionalString(reason)
    });

    return {
      action: "reset",
      item,
      category: item.category,
      quantity: removedQuantity,
      totalQuantity: 0,
      removals: removedVariants,
      reason: cleanOptionalString(reason)
    };
  });
}

async function getPermissionsConfig() {
  const snapshot = await getSnapshot();
  const dbPermissions = snapshot.permissions && typeof snapshot.permissions === "object" ? snapshot.permissions : {};
  const permissions = {
    add: Array.isArray(dbPermissions.add) ? dbPermissions.add : [],
    remove: Array.isArray(dbPermissions.remove) ? dbPermissions.remove : [],
    reset: Array.isArray(dbPermissions.reset) ? dbPermissions.reset : []
  };
  return {
    add: [...new Set(permissions.add)],
    remove: [...new Set(permissions.remove)],
    reset: [...new Set(permissions.reset)]
  };
}

async function addPermissionRole(action, roleId) {
  assertPermissionAction(action);
  if (!roleId) {
    throw new Error("R\u00F4le invalide.");
  }

  return withMutation(async (database) => {
    ensurePermissionsRecord(database);
    database.permissions[action] = Array.from(new Set([...database.permissions[action], roleId]));
    return clonePermissionsFromDatabase(database);
  });
}

async function removePermissionRole(action, roleId) {
  assertPermissionAction(action);
  if (!roleId) {
    throw new Error("R\u00F4le invalide.");
  }

  return withMutation(async (database) => {
    ensurePermissionsRecord(database);
    database.permissions[action] = database.permissions[action].filter((existing) => existing !== roleId);
    return clonePermissionsFromDatabase(database);
  });
}

async function clearPermissionRoles(action) {
  assertPermissionAction(action);

  return withMutation(async (database) => {
    ensurePermissionsRecord(database);
    database.permissions[action] = [];
    return clonePermissionsFromDatabase(database);
  });
}

async function getStockStats(days = 7) {
  const safeDays = Math.max(1, Math.min(days, 365));
  const snapshot = await getSnapshot();
  const stockView = await getStockView();

  const entries = stockView.entries;
  const categories = new Map();
  for (const entry of entries) {
    if (!categories.has(entry.category)) {
      categories.set(entry.category, { references: 0, units: 0 });
    }
    const aggregate = categories.get(entry.category);
    aggregate.references += 1;
    aggregate.units += entry.totalQuantity;
  }

  const now = Date.now();
  const cutoff = now - safeDays * 24 * 60 * 60 * 1000;
  const recentHistory = snapshot.history.filter((entry) => {
    if (!entry.timestamp) {
      return false;
    }
    return new Date(entry.timestamp).getTime() >= cutoff;
  });

  const trend = {
    events: recentHistory.length,
    addEvents: 0,
    removeEvents: 0,
    resetEvents: 0,
    addedUnits: 0,
    removedUnits: 0,
    resetUnits: 0
  };

  for (const entry of recentHistory) {
    const quantity = entry.quantity || 0;
    if (entry.action === "add") {
      trend.addEvents += 1;
      trend.addedUnits += quantity;
    } else if (entry.action === "remove") {
      trend.removeEvents += 1;
      trend.removedUnits += quantity;
    } else if (entry.action === "reset") {
      trend.resetEvents += 1;
      trend.resetUnits += quantity;
    }
  }

  const sortedByQuantity = [...entries].sort((a, b) => b.totalQuantity - a.totalQuantity);
  const topItem = sortedByQuantity[0] || null;
  const bottomItem = sortedByQuantity.length ? sortedByQuantity[sortedByQuantity.length - 1] : null;
  const lastAction = snapshot.history[0] || null;

  return {
    days: safeDays,
    totals: {
      references: stockView.totalReferences,
      units: stockView.totalUnits,
      categories: categories.size
    },
    categories: Array.from(categories.entries())
      .map(([name, values]) => ({
        name,
        references: values.references,
        units: values.units
      }))
      .sort((a, b) => b.units - a.units),
    trend,
    topItem,
    bottomItem,
    lastAction
  };
}

module.exports = {
  addToStock,
  removeFromStock,
  getStockView,
  searchStockEntries,
  getItemStockById,
  getHistoryView,
  getTopItemsByAction,
  buildExportFile,
  resetItemStock,
  getPermissionsConfig,
  addPermissionRole,
  removePermissionRole,
  clearPermissionRoles,
  getStockStats,
  PERMISSION_ACTIONS
};
