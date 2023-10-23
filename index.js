//nihar
const express = require('express');
const otpGenerator = require('otp-generator');
const twilio = require('twilio'); 
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const app = express();
const port = 9000;

// Use body-parser to parse JSON data
app.use(bodyParser.json());

app.use(cors());

const twilioAccountSid = 'AC8bc8fa28a97f1d566f41d0187e7c18d1';
const twilioAuthToken = '8983f3365db760ecc52ae85799ef2f2c';
const twilioPhoneNumber = '+1 929 383 5126';

const twilioClient = new twilio(twilioAccountSid, twilioAuthToken);

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
      const { email, password, phone } = req.body;
  
      // Generate a random OTP
      const otp = otpGenerator.generate(6, { digits: true, specialChars: false, alphabets: false });
  
      // Access the database and collection
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
  
      // Check if the email already exists
      const existingUser = await collection.findOne({ email });
  
      if (existingUser) {
        res.status(400).json({ message: 'Email already exists' });
      } else {
        // Hash the password before saving it to the database
        const hashedPassword = await bcrypt.hash(password, 10);
  
        // Insert the new user with hashed password and OTP into the collection
        const result = await collection.insertOne({
          email,
          password: hashedPassword,
          otp,
        });
  
        // Send the OTP to the user via SMS using Twilio
        twilioClient.messages
          .create({
            to: phone,
            from: twilioPhoneNumber,
            body: `Your OTP for signup: ${otp}`,
          })
          .then(() => {
            res.status(200).json({ message: 'Signup successful. OTP sent to your phone' });
          })
          .catch((error) => {
            console.error(error);
            res.status(500).json({ error: 'Error sending OTP via SMS' });
          });
      }
    } catch (error) {
      res.status(500).json({ error: 'An error occurred' });
    }
  });

  app.post('/verify', async (req, res) => {
    try {
      const { email, password, otp } = req.body;
  
      // Access the database and collection
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
  
      // Find the user by email
      const user = await collection.findOne({ email });
  
      if (!user) {
        res.status(400).json({ message: 'Email not found' });
      } else {
        // Verify the provided password
        const passwordMatch = await bcrypt.compare(password, user.password);
  
        if (passwordMatch) {
          // Check if the provided OTP matches the stored OTP
          if (otp === user.otp) {
            // Redirect the user to the main website upon successful OTP verification
            res.status(200).json({ message: 'Signin successful. Redirect to main website' });
          } else {
            res.status(401).json({ message: 'Incorrect OTP' });
          }
        } else {
          res.status(401).json({ message: 'Incorrect password' });
        }
      }
    } catch (error) {
      res.status(500).json({ error: 'An error occurred' });
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
