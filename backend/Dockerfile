# The API, as an image. Built from the repository root (see docker-compose.yml)
# rather than from backend/, because backend/ requires ../db/pool and
# ../db/term at run time - db/ is part of the server, not only of setup.
#
# The same image runs the one-off migrate and seed services, which is why
# db/migrate.js, db/seed.js and db/migrations are copied whole.

FROM node:22-bookworm-slim

WORKDIR /app

# Dependencies first, so a source edit does not reinstall them. bcrypt is
# native: installing inside the image is what gives it a Linux binary, which is
# also why .dockerignore keeps the host's node_modules out.
COPY db/package.json db/package-lock.json db/
RUN npm --prefix db ci --omit=dev
COPY backend/package.json backend/package-lock.json backend/
RUN npm --prefix backend ci --omit=dev

COPY db/ db/
COPY backend/ backend/

# Uploaded evidence lives on a volume (EVIDENCE_DIR in docker-compose.yml).
# Creating the directory here, owned by `node`, is what gives a fresh named
# volume that owner on its first mount.
RUN mkdir -p /data/evidence && chown -R node:node /data
USER node

WORKDIR /app/backend
ENV PORT=3150
EXPOSE 3150
CMD ["node", "server.js"]
