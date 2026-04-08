FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    tesseract-ocr \
    poppler-utils \
    ghostscript \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]
