# StudyNook Server

A Node.js Express server for managing rooms and bookings with MongoDB.

## Features

- List all rooms
- Fetch available rooms
- Get room details by ID
- Create, update, and delete rooms
- Create bookings and cancel bookings
- Get user-specific rooms and bookings
- JWT-protected room detail,add-room, my-listings, my-bookings endpoint via JWKS

## Requirements

- Node.js
- MongoDB
- `.env` file with MongoDB connection string

## Environment Variables

Create a `.env` file in the project root and set:

```env
PORT=8000
MONGO_URI=<your-mongodb-connection-string>
# or
MONGODB_URI=<your-mongodb-connection-string>
```

## Installation

```bash
npm install
```

## Run

```bash
node index.js
```

The server listens on `http://localhost:8000` by default.

## API Endpoints

- `GET /` - health check
- `GET /rooms` - fetch all rooms
- `GET /available-rooms` - fetch a limited set of available rooms
- `GET /rooms/:id` - fetch room details (requires bearer token)
- `GET /my-rooms/:userId` - fetch rooms owned by a user
- `POST /rooms` - add a new room
- `PATCH /rooms/:id` - update a room
- `DELETE /rooms/:id` - delete a room
- `POST /bookings` - create a booking
- `GET /bookings/:userId` - fetch bookings for a user
- `PATCH /bookings/:id/cancel` - cancel a booking

## Notes

- The server uses `cors` and `express.json()`.
- Booking creation increments a room's `bookingCount`.
- Cancelling a booking decrements the corresponding room's `bookingCount`.
- Room detail access is protected with JWT verification against a JWKS endpoint.
