const fs = require("node:fs/promises");
const path = require("node:path");

const DB_PATH = path.join(process.cwd(), "data", "stock-db.json");

const DEFAULT_DB = Object.freeze({
  stock: {},
  history: [],
  permissions: {
    add: [],
    remove: [],
    reset: []
  }
});

let initialized = false;
let db = cloneDeep(DEFAULT_DB);
let queue = Promise.resolve();

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeDatabase(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return cloneDeep(DEFAULT_DB);
  }

  const rawPermissions = parsed.permissions && typeof parsed.permissions === "object" ? parsed.permissions : {};

  const permissions = {
    add: Array.isArray(rawPermissions.add) ? rawPermissions.add.filter((roleId) => typeof roleId === "string") : [],
    remove: Array.isArray(rawPermissions.remove)
      ? rawPermissions.remove.filter((roleId) => typeof roleId === "string")
      : [],
    reset: Array.isArray(rawPermissions.reset)
      ? rawPermissions.reset.filter((roleId) => typeof roleId === "string")
      : []
  };

  return {
    stock: parsed.stock && typeof parsed.stock === "object" ? parsed.stock : {},
    history: Array.isArray(parsed.history) ? parsed.history : [],
    permissions
  };
}

async function ensureDatabaseFile() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
}

async function initDatabase() {
  if (initialized) {
    return;
  }

  await ensureDatabaseFile();
  const raw = await fs.readFile(DB_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw);
    db = sanitizeDatabase(parsed);
  } catch {
    db = cloneDeep(DEFAULT_DB);
    await persist();
  }

  initialized = true;
}

async function persist() {
  const tempPath = `${DB_PATH}.tmp`;
  const payload = JSON.stringify(db, null, 2);
  await fs.writeFile(tempPath, payload, "utf8");
  await fs.rename(tempPath, DB_PATH);
}

async function withMutation(mutator) {
  const run = queue.then(async () => {
    await initDatabase();
    const result = await mutator(db);
    await persist();
    return result;
  });

  queue = run.catch(() => undefined);
  return run;
}

async function getSnapshot() {
  await initDatabase();
  return cloneDeep(db);
}

module.exports = {
  getSnapshot,
  withMutation
};
