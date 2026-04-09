# Multi-stage build for SPOTIX
FROM node:18-alpine AS frontend
WORKDIR /app/spotx
COPY spotx/package*.json ./
RUN npm ci --only=production
COPY spotx/ ./
RUN npm run build

FROM alpine AS backend
RUN apk add --no-cache cmake make gcc g++ musl-dev ffmpeg
WORKDIR /app/spotx-backend
COPY spotx-backend/ ./
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build

FROM alpine:latest
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=backend /app/spotx-backend/build/spotx-server /app/spotx-server
COPY --from=frontend /app/spotx/dist /app/www
EXPOSE 8787
CMD ["./spotx-server"]
