const express = require('express');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 8000;

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MongoDB connection string. Set MONGO_URI in .env or the environment.');
  process.exit(1);
}


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3000/api/auth/jwks')
)

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  try {
    const {payload} = await jwtVerify(token, JWKS);
  console.log(payload);
  next();
  }catch {
    return res.status(403).send({ message: 'Forbidden' });
  }

}


async function server() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const data = client.db('roomsdb');
    const roomsCollection = data.collection('rooms');

    const bookingsCollection = data.collection('bookings');

    app.get('/rooms', async (req, res) => {
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/available-rooms', async (req, res) => {
      const cursor = roomsCollection.find().limit(4);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/rooms/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const room = await roomsCollection.findOne(query);
      res.send(room);
    });

    app.post('/rooms', async (req, res) => {
      const room = req.body;
      const result = await roomsCollection.insertOne(room);
      res.send(result);
    });

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get('/bookings/:userId', async (req, res) => {
      const userId = req.params.userId;
      const query = { userId: userId };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });


    app.patch('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const room = await roomsCollection.updateOne(query, { $set: req.body });
      res.send(room);
    });

    app.delete('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const room = await roomsCollection.deleteOne(query);
      res.send(room);
    });




    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
server().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello, World!');
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});