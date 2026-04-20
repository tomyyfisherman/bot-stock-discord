# Bot Discord - Gestion de stock (Slash Commands)

Bot Discord complet en **discord.js v14** avec :

- Slash commands uniquement
- Réponses uniquement en embeds
- Gestion de stock persistante en temps réel (base JSON locale)
- Logs Discord pour chaque ajout, retrait et réinitialisation, avec mention de l'utilisateur
- Vue du stock paginée avec boutons
- Autocomplétion intelligente sur les items et variantes
- Permissions par rôle pour les commandes sensibles
- Export JSON/CSV, historique, tops et statistiques

## Commandes

- `/ajouter-au-stock item quantite durabilite? enchantement?`
- `/retirer-du-stock item quantite durabilite? enchantement?`
- `/voir-stock`
- `/rechercher-item recherche? categorie? page? par_page?`
- `/fiche-item item`
- `/historique-stock action? utilisateur? page? par_page?`
- `/top-consommation jours? limite?`
- `/top-ajouts jours? limite?`
- `/export-stock format?`
- `/reset-item item confirmation raison?`
- `/permissions-stock voir | ajouter | retirer | vider`
- `/stats-stock jours?`
- `/uptime`
- `/help`

## Prérequis

- Node.js 18+
- Un bot Discord configuré avec l'intent `Guilds`

## Installation

```bash
npm install
```

Copie `.env.example` vers `.env` puis renseigne :

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID` (optionnel mais recommandé pour tester immédiatement)
- `LOG_CHANNEL_ID` (optionnel, salon de logs)

## Déploiement des slash commands

```bash
npm run deploy
```

## Lancement du bot

```bash
npm start
```

## Base de données interne

Le stock est enregistré automatiquement dans :

- `data/stock-db.json`

Chaque opération est écrite immédiatement sur disque.

## Deploiement automatique via GitHub Actions (SSH + PM2)

Le projet contient maintenant un workflow pret a l'emploi :

- `.github/workflows/deploy.yml`
- `ecosystem.config.cjs`

### 1. Preparation du serveur (une seule fois)

Sur ton hebergeur, dans le dossier du bot :

```bash
cd /chemin/vers/ton/bot
npm ci
npm install -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Assure-toi aussi que le fichier `.env` est deja present sur le serveur.

### 2. Secrets a creer dans GitHub

Dans `Settings > Secrets and variables > Actions > Secrets` :

- `SSH_HOST` : IP ou domaine du serveur
- `SSH_PORT` : port SSH (22 par defaut)
- `SSH_USER` : utilisateur SSH
- `SSH_PRIVATE_KEY` : cle privee autorisee sur le serveur
- `APP_DIR` : chemin absolu du projet sur le serveur

Optionnel, dans `Settings > Secrets and variables > Actions > Variables` :

- `DEPLOY_BRANCH` : branche a deployer (par defaut : branche du push)
- `RUN_DISCORD_DEPLOY` : `1` pour lancer `npm run deploy` a chaque push, `0` sinon

### 3. Utilisation

- Chaque `git push` sur `main` declenche le deploiement.
- Tu peux aussi le lancer manuellement avec `Actions > Deploiement automatique > Run workflow`.

Le workflow fait automatiquement :

1. connexion SSH
2. `git pull` sur le serveur
3. `npm ci --omit=dev`
4. `npm run deploy` (optionnel)
5. redemarrage PM2 via `pm2 startOrReload ecosystem.config.cjs --env production`
"# bot-stock-discord" 
# bot-stock-discord
