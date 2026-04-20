const ITEMS = [
  { id: "argent", name: "Argent", category: "Monnaie" },

  { id: "canne-aluminium", name: "Canne à pêche en aluminium", category: "Cannes à pêche" },
  { id: "canne-bois", name: "Canne à pêche en bois", category: "Cannes à pêche" },
  { id: "canne-carbone", name: "Canne à pêche en carbone", category: "Cannes à pêche" },
  { id: "canne-nebuleuse", name: "Canne à pêche nébuleuse", category: "Cannes à pêche" },
  { id: "canne-tortue", name: "Canne à pêche en tortue", category: "Cannes à pêche" },
  { id: "canne-pierre-lune", name: "Canne à pêche en pierre de lune", category: "Cannes à pêche" },
  { id: "canne-farfadet", name: "Canne à pêche farfadet", category: "Cannes à pêche" },
  { id: "canne-poussin", name: "Canne à pêche poussin", category: "Cannes à pêche" },
  { id: "canne-imperiale", name: "Canne à pêche impériale", category: "Cannes à pêche" },
  { id: "canne-chocolat", name: "Canne à pêche chocolat", category: "Cannes à pêche" },
  { id: "canne-neige", name: "Canne à pêche neige", category: "Cannes à pêche" },
  { id: "canne-squelette", name: "Canne à pêche squelette", category: "Cannes à pêche" },
  { id: "canne-pain-epice", name: "Canne à pêche pain d'épice", category: "Cannes à pêche" },
  { id: "canne-sakura", name: "Canne à pêche Sakura", category: "Cannes à pêche" },
  { id: "canne-lapin", name: "Canne à pêche lapin", category: "Cannes à pêche" },
  { id: "canne-citrouille", name: "Canne à pêche citrouille", category: "Cannes à pêche" },
  { id: "canne-noel", name: "Canne à pêche Noël", category: "Cannes à pêche" },
  { id: "canne-leviathan-dore", name: "Canne à pêche Léviathan doré", category: "Cannes à pêche" },
  { id: "canne-yeti", name: "Canne à pêche Yéti", category: "Cannes à pêche" },
  { id: "canne-poule-abyssale", name: "Canne à pêche poule abyssale", category: "Cannes à pêche" },

  { id: "potion-chance-coffre", name: "Potion Chance Coffre", category: "Potions" },
  { id: "potion-chance", name: "Potion Chance", category: "Potions" },
  { id: "potion-drop", name: "Potion Drop", category: "Potions" },
  { id: "potion-no-skill", name: "Potion No Skill", category: "Potions" },
  { id: "potion-vitesse", name: "Potion Vitesse", category: "Potions" },
  { id: "potion-xp", name: "Potion XP", category: "Potions" },

  { id: "guimauve-astrale", name: "Guimauve astrale", category: "Friandises" },
  { id: "sucre-orge-astral", name: "Sucre d'orge astral", category: "Friandises" },
  { id: "bonbon-spectral", name: "Bonbon spectral", category: "Friandises" },
  { id: "guimauve-no-skill", name: "Guimauve No Skill", category: "Friandises" },
  { id: "bonbon-ensanglante", name: "Bonbon ensanglanté", category: "Friandises" },
  { id: "sucre-orge-no-skill", name: "Sucre d'orge No Skill", category: "Friandises" },
  { id: "guimauve-xp", name: "Guimauve XP", category: "Friandises" },
  { id: "guimauve-chance", name: "Guimauve Chance", category: "Friandises" },
  { id: "guimauve-vitesse", name: "Guimauve Vitesse", category: "Friandises" },
  { id: "sucre-orge-vitesse", name: "Sucre d'orge Vitesse", category: "Friandises" },
  { id: "sucre-orge-drop", name: "Sucre d'orge Drop", category: "Friandises" },
  { id: "guimauve-coffre", name: "Guimauve Coffre", category: "Friandises" },
  { id: "bonbon-citrouille", name: "Bonbon citrouille", category: "Friandises" },
  { id: "sucre-orge-chance", name: "Sucre d'orge Chance", category: "Friandises" },
  { id: "sucre-orge-xp", name: "Sucre d'orge XP", category: "Friandises" },
  { id: "sucre-orge-coffre", name: "Sucre d'orge Coffre", category: "Friandises" },
  { id: "bonbon-tisse", name: "Bonbon tissé", category: "Friandises" },
  { id: "bonbon-maudit", name: "Bonbon maudit", category: "Friandises" },
  { id: "guimauve-drop", name: "Guimauve Drop", category: "Friandises" },

  { id: "appat-tropical", name: "Appât tropical", category: "Appâts" },
  { id: "appat-eau-douce", name: "Appât d'eau douce", category: "Appâts" },
  { id: "appat-mer", name: "Appât de mer", category: "Appâts" },
  { id: "appat-glaces", name: "Appât des glaces", category: "Appâts" },
  { id: "appat-halloween", name: "Appât Halloween", category: "Appâts" },
  { id: "appat-noel", name: "Appât Noël", category: "Appâts" },
  { id: "appat-illegal", name: "Appât illégal", category: "Appâts" },

  { id: "coffre-legendaire", name: "Coffre légendaire", category: "Coffres" },
  { id: "coffre-epique", name: "Coffre épique", category: "Coffres" },
  { id: "coffre-mythique", name: "Coffre mythique", category: "Coffres" },
  { id: "coffre-illegal", name: "Coffre illégal", category: "Coffres" },

  { id: "nebulite", name: "Nébulite", category: "Minéraux" },
  { id: "pierre-lune", name: "Pierre de lune", category: "Minéraux" },
  { id: "pierre-marais", name: "Pierre de marais", category: "Minéraux" },
  { id: "carbonite", name: "Carbonite", category: "Minéraux" },
  { id: "pierre-avantages", name: "Pierre d'avantages", category: "Minéraux" },
  { id: "pierre-enchantement", name: "Pierre d'enchantement", category: "Minéraux" },
  { id: "obsidienne", name: "Obsidienne", category: "Minéraux" },

  { id: "poisson-ours-polaire", name: "Poisson ours polaire", category: "Poissons et créatures" },
  { id: "poisson-cloche", name: "Poisson cloche", category: "Poissons et créatures" },
  { id: "poisson-citrouille", name: "Poisson citrouille", category: "Poissons et créatures" },
  { id: "poisson-lapin", name: "Poisson lapin", category: "Poissons et créatures" },
  { id: "meduse-bonbon", name: "Méduse bonbon", category: "Poissons et créatures" },
  { id: "poisson-nebuleux", name: "Poisson nébuleux", category: "Poissons et créatures" },
  { id: "poisson-chocolat", name: "Poisson chocolat", category: "Poissons et créatures" },
  { id: "poisson-jack-of-fin", name: "Poisson Jack of Fin", category: "Poissons et créatures" },
  { id: "orque", name: "Orque", category: "Poissons et créatures" },
  { id: "poisson-lutin", name: "Poisson lutin", category: "Poissons et créatures" },
  { id: "poisson-gamma", name: "Poisson gamma", category: "Poissons et créatures" },
  { id: "poisson-pain-epice", name: "Poisson pain d'épice", category: "Poissons et créatures" },
  { id: "meduse-guirlande", name: "Méduse guirlande", category: "Poissons et créatures" },
  { id: "tortue", name: "Tortue", category: "Poissons et créatures" },
  { id: "carapace-tortue", name: "Carapace de tortue", category: "Poissons et créatures" },
  { id: "poisson-fugu-paques", name: "Poisson fugu de Pâques", category: "Poissons et créatures" },
  { id: "carpe-vampire", name: "Carpe vampire", category: "Poissons et créatures" },
  { id: "cryofin-royal", name: "Cryofin royal", category: "Poissons et créatures" },
  { id: "poisson-guimauve", name: "Poisson guimauve", category: "Poissons et créatures" },
  { id: "anguille-caramel", name: "Anguille caramel", category: "Poissons et créatures" },
  { id: "poisson-vortex", name: "Poisson vortex", category: "Poissons et créatures" },
  { id: "poisson-lune", name: "Poisson lune", category: "Poissons et créatures" },
  { id: "poisson-poussin", name: "Poisson poussin", category: "Poissons et créatures" },
  { id: "poisson-bonbon", name: "Poisson bonbon", category: "Poissons et créatures" },
  { id: "poisson-casse-noisette", name: "Poisson casse-noisette", category: "Poissons et créatures" },
  { id: "poisson-sapin-noel", name: "Poisson sapin de Noël", category: "Poissons et créatures" },
  { id: "poisson-dragon-rouge", name: "Poisson dragon rouge", category: "Poissons et créatures" },
  { id: "poisson-carotte", name: "Poisson carotte", category: "Poissons et créatures" },
  { id: "poisson-cadeau", name: "Poisson cadeau", category: "Poissons et créatures" },
  { id: "thon", name: "Thon", category: "Poissons et créatures" },
  { id: "poisson-sucre-orge", name: "Poisson sucre d'orge", category: "Poissons et créatures" },

  { id: "coeur-poisson-dragon-rouge", name: "Cœur de poisson dragon rouge", category: "Cœurs" },
  { id: "coeur-poisson-orque", name: "Cœur de poisson orque", category: "Cœurs" },
  { id: "coeur-poisson-thon", name: "Cœur de poisson thon", category: "Cœurs" }
];

const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

function normalizeForSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findItemsByQuery(query) {
  const normalizedQuery = normalizeForSearch(query || "");
  if (!normalizedQuery) {
    return ITEMS;
  }

  return ITEMS.filter((item) => normalizeForSearch(item.name).includes(normalizedQuery));
}

module.exports = {
  ITEMS,
  ITEM_BY_ID,
  findItemsByQuery
};
