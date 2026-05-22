const express = require("express");

const dotenv = require("dotenv");

dotenv.config();

const app = express();

const cors = require("cors");

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");

const {
  createRemoteJWKSet,
  jwtVerify,
} = require("jose-cjs");

app.use(cors());

app.use(express.json());

const port =
  process.env.PORT || 8000;

// MONGO URI
const uri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI;

if (!uri) {
  console.error(
    "Missing MongoDB connection string"
  );

  process.exit(1);
}

// MONGODB CLIENT
const client = new MongoClient(
  uri,
  {
    serverApi: {
      version:
        ServerApiVersion.v1,

      strict: true,

      deprecationErrors: true,
    },
  }
);

// JWKS
const JWKS =
  createRemoteJWKSet(
    new URL(
      `${process.env.CLIENT_URL}/api/auth/jwks`
    )
  );

// VERIFY TOKEN
const verifyToken = async (
  req,
  res,
  next
) => {
  const authHeader =
    req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];


  if (!token) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  try {
    const { payload } =
      await jwtVerify(
        token,
        JWKS
      );

    req.user = payload;

    next();
  } catch {
    return res.status(403).send({
      message: "Forbidden",
    });
  }
};




async function server() {
  try {
    // await client.connect();

    console.log(
      "MongoDB Connected"
    );

    // DATABASE
    const data = client.db("roomsdb");

    // COLLECTIONS
    const roomsCollection = data.collection("rooms");

    // BOOKINGS COLLECTION
    const bookingsCollection = data.collection("bookings");


    //get all rooms
    app.get("/rooms", async (req, res) => {
      try {
        const result =
          await roomsCollection
            .find()
            .sort({
              createdAt: -1,
            })
            .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );


    //AVAILABLE ROOMS
    app.get("/available-rooms", async (req, res) => {
      try {
        const result =
          await roomsCollection
            .find()
            .limit(3)
            .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );


    //room details
    app.get("/rooms/:id", verifyToken, async (req, res) => {
      try {
        const id =
          req.params.id;

        const query = {
          _id: new ObjectId(
            id
          ),
        };

        const room =
          await roomsCollection.findOne(
            query
          );

        if (!room) {
          return res
            .status(404)
            .send({
              success: false,
              message:
                "Room not found",
            });
        }

        res.send(room);
      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );


    // MY ROOMS
    app.get("/my-rooms/:userId", verifyToken, async (req, res) => {
      try {
        const userId = req.params.userId;

        const query = {
          ownerId: userId,
        };

        const rooms = await roomsCollection.find(query).sort({ createdAt: -1, }).toArray();
        res.send(rooms);

      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );

    //add room
    app.post("/rooms", verifyToken, async (req, res) => {
      try {
        const room =
          req.body;

        // DEFAULTS
        room.bookingCount = 0;

        room.createdAt =
          new Date();

        const result =
          await roomsCollection.insertOne(
            room
          );

        res.send({
          success: true,
          message:
            "Room added successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );

    //update room
    app.patch("/rooms/:id", verifyToken, async (req, res) => {
      try {
        const id =
          req.params.id;

        const updatedData =
          req.body;

        const query = {
          _id: new ObjectId(
            id
          ),
        };

        const updateDoc = {
          $set: updatedData,
        };

        const result =
          await roomsCollection.updateOne(
            query,
            updateDoc
          );

        res.send({
          success: true,
          message:
            "Room updated successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );


    //delete room
    app.delete("/rooms/:id", verifyToken, async (req, res) => {
      try {
        const id =
          req.params.id;

        const query = {
          _id: new ObjectId(
            id
          ),
        };

        const result =
          await roomsCollection.deleteOne(
            query
          );

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );


    //create booking
    app.post("/bookings", verifyToken, async (req, res) => {
      try {
        const booking =
          req.body;

        booking.status =
          "confirmed";

        booking.createdAt =
          new Date();

        const result =
          await bookingsCollection.insertOne(
            booking
          );

        // INCREMENT BOOKING COUNT
        await roomsCollection.updateOne(
          {
            _id: new ObjectId(
              booking.roomId
            ),
          },
          {
            $inc: {
              bookingCount: 1,
            },
          }
        );

        res.send({
          success: true,
          message:
            "Booking successful",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );


    //get my bookings
    app.get("/bookings/:userId", verifyToken, async (req, res) => {
      try {
        const userId = req.params.userId;

        const query = {
          userId: userId,
        };

        const bookings = await bookingsCollection.find(query).sort({ createdAt: -1, }).toArray();
        res.send(bookings);
      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );


    //cancel booking
    app.patch("/bookings/:id/cancel", verifyToken, async (req, res) => {
      try {
        const id =
          req.params.id;

        const userId =
          req.body.userId;

        // FIND BOOKING
        const booking =
          await bookingsCollection.findOne(
            {
              _id: new ObjectId(
                id
              ),
            }
          );

        // BOOKING EXISTS?
        if (!booking) {
          return res
            .status(404)
            .send({
              success: false,
              message:
                "Booking not found",
            });
        }

        // VERIFY OWNER
        if (
          booking.userId !==
          userId
        ) {
          return res
            .status(401)
            .send({
              success: false,
              message:
                "Unauthorized access",
            });
        }

        // ALREADY CANCELLED?
        if (
          booking.status ===
          "cancelled"
        ) {
          return res
            .status(400)
            .send({
              success: false,
              message:
                "Booking already cancelled",
            });
        }

        // UPDATE STATUS
        const result =
          await bookingsCollection.updateOne(
            {
              _id: new ObjectId(
                id
              ),
            },
            {
              $set: {
                status:
                  "cancelled",
              },
            }
          );

        // DECREMENT BOOKING COUNT
        await roomsCollection.updateOne(
          {
            _id: new ObjectId(
              booking.roomId
            ),
          },
          {
            $inc: {
              bookingCount: -1,
            },
          }
        );

        res.send({
          success: true,
          message:
            "Booking cancelled successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message:
            error.message,
        });
      }
    }
    );

    // ROOT
    app.get("/", (req, res) => {
      res.send(
        "StudyNook Server Running"
      );
    });
  } finally {
  }
}

server().catch(console.dir);

// SERVER
app.listen(port, () => {
  console.log(
    `Server running on http://localhost:${port}`
  );
});