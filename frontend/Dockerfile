# The web client, as an image: a CRA production build served by nginx.
#
# REACT_APP_API_URL is compiled into the bundle at build time, not read when
# the container starts, so changing the backend's address means rebuilding
# this image (docker compose build frontend). It is the address the *browser*
# dials, hence localhost and the published port, not the compose service name.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG REACT_APP_API_URL=http://localhost:3150
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    GENERATE_SOURCEMAP=false
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
