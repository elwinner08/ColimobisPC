FROM node:22.9.0-slim

WORKDIR /usr/src/app

# Copier et installer les dependances du serveur Express
COPY server/package*.json ./server/
RUN cd server && npm install

# Copier le serveur et l'application pre-compilee
COPY server/server.js ./server/
COPY app/www/ ./app/www/

# Creer le dossier data avec un CSV vide si besoin
RUN mkdir -p data

ENV PORT=8100

EXPOSE ${PORT}

CMD ["node", "server/server.js"]
