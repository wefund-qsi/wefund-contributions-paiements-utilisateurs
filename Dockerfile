FROM node:24-alpine

# Reproduce the monorepo structure so @projet1/* path aliases resolve correctly:
# baseUrl = /workspace/wefund-contributions-paiements-utilisateurs/utilisateurs/
# @projet1/* → ../../wefund-projects-service/src/* = /workspace/wefund-projects-service/src/
WORKDIR /workspace/wefund-contributions-paiements-utilisateurs/utilisateurs

# Install dependencies first (layer cache)
COPY wefund-contributions-paiements-utilisateurs/utilisateurs/package*.json ./
RUN npm install

# Copy Projet 1 source for @projet1/* alias resolution
COPY wefund-projects-service/src/ /workspace/wefund-projects-service/src/

# Copy Projet 2 application source
COPY wefund-contributions-paiements-utilisateurs/utilisateurs/ ./

EXPOSE 3000
CMD ["npm", "run", "start"]
