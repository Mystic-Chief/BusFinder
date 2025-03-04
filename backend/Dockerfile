# Use Node.js 18 Alpine as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy the rest of the backend code
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Command to run the app
CMD ["node", "server.js"]