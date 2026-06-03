FROM node:18

ENV NODE_OPTIONS="--max_old_space_size=400"
ENV NEXT_TELEMETRY_DISABLED=1

# FFmpeg kurulumu
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

# Paket bağımlılıklarını kopyala
COPY package.json package-lock.json ./
RUN npm install

# Kaynak kodları kopyala
COPY . .

# Next.js derlemesi
RUN npm run build

EXPOSE 3000

# Uygulamayı başlat
CMD ["npm", "start"]
