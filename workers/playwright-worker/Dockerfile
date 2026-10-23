FROM mcr.microsoft.com/playwright:v1.52.0-noble

RUN apt-get update \
    && apt-get install -y --no-install-recommends xvfb x11vnc fluxbox novnc websockify \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src

ENV PORT=3000
ENV DISPLAY=:99
ENV ENABLE_VNC=1
ENV NOVNC_PORT=6080
ENV VNC_PORT=5900
EXPOSE 3000 6080

CMD ["node", "src/server.js"]
