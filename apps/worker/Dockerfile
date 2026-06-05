FROM node:22-alpine

WORKDIR /workspace
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
RUN npm install --workspaces --include-workspace-root
WORKDIR /workspace/apps/worker
CMD ["npm", "run", "dev"]

