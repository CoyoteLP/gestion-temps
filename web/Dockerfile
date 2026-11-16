# Image du front-end gestion-temps (Next.js, sortie standalone).
#   docker build -t <registre>/gestion-temps-web:<version> web
# Aucune variable d'environnement n'est nécessaire au build : toutes sont lues au démarrage
# (voir docs/DEPLOIEMENT.md). Images de base épinglées par empreinte (mises à jour volontaires).

# 1. Dépendances : installées depuis le lock, versions exactes
FROM node:22.22.0-bookworm-slim@sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3 AS dependances
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 2. Construction : serveur autonome dans .next/standalone
FROM node:22.22.0-bookworm-slim@sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3 AS construction
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependances /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Exécution : Node 22 seul (sans shell ni gestionnaire de paquets), utilisateur non root
FROM gcr.io/distroless/nodejs22-debian12:nonroot@sha256:13593b7570658e8477de39e2f4a1dd25db2f836d68a0ba771251572d23bb4f8e
WORKDIR /app
ENV NODE_ENV=production \
	NEXT_TELEMETRY_DISABLED=1 \
	HOSTNAME=0.0.0.0 \
	PORT=3000
COPY --from=construction --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=construction --chown=nonroot:nonroot /app/.next/static ./.next/static
# Le dossier public/ est vide : à copier ici (./public) quand il contiendra des fichiers
USER nonroot
EXPOSE 3000
CMD ["server.js"]
