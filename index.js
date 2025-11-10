const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config({ path: ".env.local" });

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // Database and Collection
    const db = client.db("habit-db");
    const habitsCollection = db.collection("habits");

    // Get all habits
    app.get("/habits", async (req, res) => {
      const habits = await habitsCollection.find().toArray();
      res.send(habits);
    });

    // Get a single habit by ID
    app.get("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
      res.send(habit);
    });

    // Create a new habit
    app.post("/habits", async (req, res) => {
      const newHabit = req.body;
      const result = await habitsCollection.insertOne(newHabit);
      res.send(result);
    });

    // Update a habit by ID
    app.put("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const updatedHabit = req.body;
      const result = await habitsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedHabit },
        { upsert: true }
      );
      res.send(result);
    });

    // Delete a habit by ID
    app.delete("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const result = await habitsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Ping the database to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running, Fine!");
});

app.listen(port, () => {
  console.log(`🚀 Server is listening on port ${port}`);
});
