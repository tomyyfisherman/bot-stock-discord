const { SlashCommandBuilder } = require("discord.js");
const { ITEMS } = require("./items");

const CATEGORY_CHOICES = Array.from(new Set(ITEMS.map((item) => item.category)))
  .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
  .map((category) => ({
    name: category,
    value: category
  }));

const PERMISSION_ACTION_CHOICES = [
  { name: "Ajouter au stock", value: "add" },
  { name: "Retirer du stock", value: "remove" },
  { name: "Réinitialiser un item", value: "reset" }
];

const addCommand = new SlashCommandBuilder()
  .setName("ajouter-au-stock")
  .setDescription("Ajouter un objet au stock")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("Objet concerné")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("quantite")
      .setDescription("Quantité")
      .setRequired(true)
      .setMinValue(1)
  )
  .addIntegerOption((option) =>
    option
      .setName("durabilite")
      .setDescription("Durabilité (facultatif)")
      .setRequired(false)
      .setMinValue(0)
  )
  .addStringOption((option) =>
    option
      .setName("enchantement")
      .setDescription("Enchantement (facultatif)")
      .setRequired(false)
      .setMaxLength(100)
  );

const removeCommand = new SlashCommandBuilder()
  .setName("retirer-du-stock")
  .setDescription("Retirer un objet du stock")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("Objet concerné")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("quantite")
      .setDescription("Quantité")
      .setRequired(true)
      .setMinValue(1)
      .setAutocomplete(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("durabilite")
      .setDescription("Durabilité (facultatif)")
      .setRequired(false)
      .setMinValue(0)
      .setAutocomplete(true)
  )
  .addStringOption((option) =>
    option
      .setName("enchantement")
      .setDescription("Enchantement (facultatif)")
      .setRequired(false)
      .setMaxLength(100)
      .setAutocomplete(true)
  );

const searchCommand = new SlashCommandBuilder()
  .setName("rechercher-item")
  .setDescription("Rechercher des objets dans le stock")
  .addStringOption((option) =>
    option
      .setName("recherche")
      .setDescription("Nom ou mot-clé de l'objet")
      .setRequired(false)
      .setMaxLength(100)
  )
  .addStringOption((option) =>
    option
      .setName("categorie")
      .setDescription("Filtrer par catégorie")
      .setRequired(false)
      .addChoices(...CATEGORY_CHOICES)
  )
  .addIntegerOption((option) =>
    option
      .setName("page")
      .setDescription("Page des résultats")
      .setRequired(false)
      .setMinValue(1)
  )
  .addIntegerOption((option) =>
    option
      .setName("par_page")
      .setDescription("Nombre de lignes par page (1-20)")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(20)
  );

const itemSheetCommand = new SlashCommandBuilder()
  .setName("fiche-item")
  .setDescription("Afficher la fiche détaillée d'un objet")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("Objet à afficher")
      .setRequired(true)
      .setAutocomplete(true)
  );

const historyCommand = new SlashCommandBuilder()
  .setName("historique-stock")
  .setDescription("Afficher l'historique des actions de stock")
  .addStringOption((option) =>
    option
      .setName("action")
      .setDescription("Filtrer par type d'action")
      .setRequired(false)
      .addChoices(
        { name: "Ajouts", value: "add" },
        { name: "Retraits", value: "remove" },
        { name: "Réinitialisations", value: "reset" }
      )
  )
  .addUserOption((option) =>
    option
      .setName("utilisateur")
      .setDescription("Filtrer sur un utilisateur")
      .setRequired(false)
  )
  .addIntegerOption((option) =>
    option
      .setName("page")
      .setDescription("Page des résultats")
      .setRequired(false)
      .setMinValue(1)
  )
  .addIntegerOption((option) =>
    option
      .setName("par_page")
      .setDescription("Nombre de lignes par page (5-20)")
      .setRequired(false)
      .setMinValue(5)
      .setMaxValue(20)
  );

const topConsumptionCommand = new SlashCommandBuilder()
  .setName("top-consommation")
  .setDescription("Top des objets les plus retirés")
  .addIntegerOption((option) =>
    option
      .setName("jours")
      .setDescription("Période d'analyse en jours")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(3650)
  )
  .addIntegerOption((option) =>
    option
      .setName("limite")
      .setDescription("Nombre max d'objets dans le classement")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(25)
  );

const topAdditionsCommand = new SlashCommandBuilder()
  .setName("top-ajouts")
  .setDescription("Top des objets les plus ajoutés")
  .addIntegerOption((option) =>
    option
      .setName("jours")
      .setDescription("Période d'analyse en jours")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(3650)
  )
  .addIntegerOption((option) =>
    option
      .setName("limite")
      .setDescription("Nombre max d'objets dans le classement")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(25)
  );

const exportCommand = new SlashCommandBuilder()
  .setName("export-stock")
  .setDescription("Exporter le stock en JSON ou CSV")
  .addStringOption((option) =>
    option
      .setName("format")
      .setDescription("Format d'export")
      .setRequired(false)
      .addChoices(
        { name: "JSON", value: "json" },
        { name: "CSV", value: "csv" }
      )
  );

const resetCommand = new SlashCommandBuilder()
  .setName("reset-item")
  .setDescription("Remettre à zéro un item du stock")
  .addStringOption((option) =>
    option
      .setName("item")
      .setDescription("Objet à réinitialiser")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption((option) =>
    option
      .setName("confirmation")
      .setDescription("Écris CONFIRMER pour valider")
      .setRequired(true)
      .setMaxLength(20)
  )
  .addStringOption((option) =>
    option
      .setName("raison")
      .setDescription("Raison de la réinitialisation (facultatif)")
      .setRequired(false)
      .setMaxLength(150)
  );

const permissionsCommand = new SlashCommandBuilder()
  .setName("permissions-stock")
  .setDescription("Configurer les permissions des commandes sensibles")
  .addSubcommand((subcommand) => subcommand.setName("voir").setDescription("Afficher la configuration"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("ajouter")
      .setDescription("Ajouter un rôle autorisé")
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("Commande cible")
          .setRequired(true)
          .addChoices(...PERMISSION_ACTION_CHOICES)
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Rôle à autoriser")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("retirer")
      .setDescription("Retirer un rôle autorisé")
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("Commande cible")
          .setRequired(true)
          .addChoices(...PERMISSION_ACTION_CHOICES)
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Rôle à retirer")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("vider")
      .setDescription("Retirer tous les rôles d'une action")
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("Commande cible")
          .setRequired(true)
          .addChoices(...PERMISSION_ACTION_CHOICES)
      )
  );

const statsCommand = new SlashCommandBuilder()
  .setName("stats-stock")
  .setDescription("Afficher les statistiques globales du stock")
  .addIntegerOption((option) =>
    option
      .setName("jours")
      .setDescription("Période de tendance en jours")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(365)
  );

const uptimeCommand = new SlashCommandBuilder()
  .setName("uptime")
  .setDescription("Afficher l'état en direct du bot");

const COMMAND_BUILDERS = [
  addCommand,
  removeCommand,
  new SlashCommandBuilder()
    .setName("voir-stock")
    .setDescription("Afficher le stock avec une pagination élégante"),
  searchCommand,
  itemSheetCommand,
  historyCommand,
  topConsumptionCommand,
  topAdditionsCommand,
  exportCommand,
  resetCommand,
  permissionsCommand,
  statsCommand,
  uptimeCommand,
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Afficher le guide des commandes du bot")
];

const COMMANDS_JSON = COMMAND_BUILDERS.map((command) => command.toJSON());

module.exports = {
  COMMAND_BUILDERS,
  COMMANDS_JSON
};
