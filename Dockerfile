FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose port (must match .env)
EXPOSE 3000

# Environment variables should be passed at runtime or via .env file
ENV NODE_ENV=production

# Start the application
CMD [ "npm", "start" ]
