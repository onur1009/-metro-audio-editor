FROM node:18-alpine

# FFmpeg kurulumu
RUN apk update && apk add --no-cache ffmpeg

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
