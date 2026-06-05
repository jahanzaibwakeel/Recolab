FROM node:22-alpine

WORKDIR /workspace
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm install --workspaces --include-workspace-root
WORKDIR /workspace/apps/web
CMD ["npm", "run", "dev"]

