# base node image
FROM node:24-alpine as base

ENV DEPLOYMENT_TARGET flyio

# Install openssl for Prisma
RUN apk update && apk add openssl

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

# Install all node_modules, including dev dependencies
FROM base as deps

RUN mkdir /app
WORKDIR /app

ADD package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Setup production node_modules
FROM base as production-deps

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --prod --frozen-lockfile

# Build the app
FROM base as build

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# If we're using Prisma, uncomment to cache the prisma schema
ADD prisma ./prisma
RUN pnpm prisma generate

ADD . .
RUN pnpm run build

# Finally, build the production image with minimal footprint
FROM base

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules

# Copy generated Prisma client
COPY --from=build /app/app/generated /app/app/generated

COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
ADD . .

RUN apk add ca-certificates

CMD ["pnpm", "run", "start"]
