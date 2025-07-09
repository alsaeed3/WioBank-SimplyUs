#!/bin/bash
# Script to set up email demo dependencies

echo "Installing dependencies for email demonstration..."
npm install form-data

echo "Starting the server..."
node server/index.js &

echo "Waiting for server to start..."
sleep 5

echo "Running the email demonstration..."
node demo_emails.js

echo "Demo completed! You can now view the results in the dashboard."
