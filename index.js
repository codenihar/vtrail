const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const app = express();
const port = 9000;

// Use body-parser to parse JSON data
app.use(bodyParser.json());

app.use(cors());

// MongoDB Atlas connection URI
const mongoURI = "mongodb+srv://codenihar:codenihar3@undefined.4u8nfhd.mongodb.net/";
const dbName = 'codenihar'; // Specify the database name
const collectionName = 'users'; // Specify the collection name

let client;

// Connect to MongoDB Atlas
(async () => {
  try {
    client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
})();

// Define a route to handle POST requests to /login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Access the database and collection
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Find the user by their username
    const user = await collection.findOne({ username });

    if (user) {
      // Compare the provided password with the stored hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        // Passwords match, indicating a successful login
        res.status(200).json({ message: 'Login successful' });
      } else {
        // Passwords do not match
        res.status(401).json({ message: 'Login failed: Incorrect password' });
      }
    } else {
      // User not found
      res.status(401).json({ message: 'Login failed: User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Define a route to handle POST requests to /signup
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Access the database and collection
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Check if the username already exists
    const existingUser = await collection.findOne({ username });

    if (existingUser) {
      res.status(400).json({ message: 'Username already exists' });
    } else {
      // Hash the password before saving it to the database
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new user into the collection
      const result = await collection.insertOne({
        username,
        password: hashedPassword,
      });

      res.status(200).json({ message: 'Signup successful' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
