const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config({ path: ".env.local" });
const admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 3000;

// 🔐 Firebase Admin Initialization
// index.js
const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 🧩 Middleware
app.use(cors());
app.use(express.json());

// 🧠 MongoDB Setup
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// 🔐 Verify Firebase Token Middleware
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).send({ success: false, message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("❌ Firebase token verification failed:", error);
    return res.status(403).send({ success: false, message: "Forbidden" });
  }
};

async function run() {
  try {
    // await client.connect();
    const db = client.db("habit-db");
    const habitsCollection = db.collection("habits");
    const usersCollection = db.collection("users");

    console.log("✅ Connected to MongoDB");

    const { ObjectId } = require("mongodb");

    // ========================
    // 📌 USER ROUTES
    // ========================

    // Save user data upon registration
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        if (!user.email || !user.name) {
          return res
            .status(400)
            .send({ success: false, message: "Name and email are required" });
        }

        const existing = await usersCollection.findOne({ email: user.email });

        if (existing) {
          // ✅ Instead of returning 409, just return the existing user
          return res.send({
            success: true,
            message: "User already exists",
            user: existing,
          });
        }

        const result = await usersCollection.insertOne({
          ...user,
          role: user.role || "user",
          createdAt: new Date(),
        });

        res.status(201).send({
          success: true,
          message: "User created successfully",
          userId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Get all users (requires verified token)
    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send({ success: true, users: result });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Get a single user by email
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res
            .status(404)
            .send({ success: false, message: "User not found" });
        }

        res.send({ success: true, user });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Update user role
    app.patch("/users/role/:email", verifyFirebaseToken, async (req, res) => {
      try {
        const email = req.params.email;
        const { role } = req.body;

        if (!role) {
          return res
            .status(400)
            .send({ success: false, message: "Role is required" });
        }

        const result = await usersCollection.updateOne(
          { email },
          { $set: { role } }
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .send({ success: false, message: "User not found" });
        }

        res.send({ success: true, message: "Role updated successfully" });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Delete / suspend a user by ID
    app.delete("/users/:id/suspend", verifyFirebaseToken, async (req, res) => {
      try {
        const id = req.params.id;
        const { reason, feedback } = req.body;

        const result = await usersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .send({ success: false, message: "User not found" });
        }

        // Optional: log reason & feedback somewhere (audit collection)
        // await auditCollection.insertOne({ userId: id, reason, feedback, date: new Date() });

        res.send({
          success: true,
          message: "User suspended & deleted successfully",
          reason,
          feedback,
        });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // ========================
    // 📜 HABIT ROUTES
    // ========================

    /** 🔹 Get all habits (public or user-specific) */
    app.get("/habits", async (req, res) => {
      try {
        const { userEmail, sort = "desc", limit } = req.query;
        const filter = userEmail ? { userEmail } : {};
        const sortOrder = sort === "asc" ? 1 : -1;
        const limitNum = limit ? parseInt(limit) : 0;

        const habits = await habitsCollection
          .find(filter)
          .sort({ createdAt: sortOrder })
          .limit(limitNum)
          .toArray();

        res.send(habits);
      } catch (error) {
        console.error("❌ Error fetching habits:", error);
        res.status(500).send({ message: "Failed to fetch habits" });
      }
    });

    /** 🔹 Get a single habit */
    app.get("/habits/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid Habit ID" });
        }

        const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
        if (!habit) {
          return res
            .status(404)
            .send({ success: false, message: "Habit not found" });
        }

        res.send(habit);
      } catch (error) {
        console.error("❌ Error fetching habit:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch habit" });
      }
    });

    /** 🔹 Add new habit (requires authentication) */
    app.post("/habits", verifyFirebaseToken, async (req, res) => {
      try {
        const newHabit = {
          ...req.body,
          userEmail: req.user.email,
          createdAt: new Date(),
          completionHistory: [],
          streak: 0,
          progress: 0,
        };

        const result = await habitsCollection.insertOne(newHabit);
        res.send({
          success: true,
          message: "Habit created successfully",
          result,
        });
      } catch (error) {
        console.error("❌ Error creating habit:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to create habit" });
      }
    });

    /** 🔹 Update habit (only by owner) */
    app.put("/habits/:id", verifyFirebaseToken, async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid Habit ID" });
        }

        const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
        if (!habit) {
          return res
            .status(404)
            .send({ success: false, message: "Habit not found" });
        }

        // ✅ Allow only owner to update
        if (habit.userEmail !== req.user.email) {
          return res.status(403).send({ success: false, message: "Forbidden" });
        }

        const allowedFields = [
          "title",
          "description",
          "category",
          "progress",
          "streak",
          "completionHistory",
          "image",
        ];
        const updateDoc = {};
        for (const field of allowedFields) {
          if (updatedData[field] !== undefined)
            updateDoc[field] = updatedData[field];
        }

        const result = await habitsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateDoc }
        );

        res.send({
          success: true,
          message: "Habit updated successfully",
          result,
        });
      } catch (error) {
        console.error("❌ Error updating habit:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to update habit" });
      }
    });

    /** 🔹 Update specific user's progress in a habit */
    app.patch("/habits/:id/progress", verifyFirebaseToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { userEmail, completionHistory, streak, progress } = req.body;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid Habit ID" });
        }

        if (!userEmail) {
          return res
            .status(400)
            .send({ success: false, message: "Missing user email" });
        }

        // Fetch the habit first
        const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
        if (!habit) {
          return res
            .status(404)
            .send({ success: false, message: "Habit not found" });
        }

        // Create or update the userProgressMap
        const updatedUserProgressMap = {
          ...habit.userProgressMap,
          [userEmail]: {
            completionHistory,
            streak,
            progress,
          },
        };

        // Update only this field
        const result = await habitsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { userProgressMap: updatedUserProgressMap } }
        );

        res.send({
          success: true,
          message: "User progress updated successfully",
          result,
        });
      } catch (error) {
        console.error("❌ Error updating user progress:", error);
        res.status(500).send({
          success: false,
          message: "Server error while updating progress",
        });
      }
    });

    /** 🔹 Delete habit (only by owner) */
    app.delete("/habits/:id", verifyFirebaseToken, async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid Habit ID" });
        }

        const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
        if (!habit) {
          return res
            .status(404)
            .send({ success: false, message: "Habit not found" });
        }

        if (habit.userEmail !== req.user.email) {
          return res.status(403).send({ success: false, message: "Forbidden" });
        }

        const result = await habitsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send({
          success: true,
          message: "Habit deleted successfully",
          result,
        });
      } catch (error) {
        console.error("❌ Error deleting habit:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to delete habit" });
      }
    });

    /** 🔹 Health Check */
    app.get("/", (req, res) => {
      res.send("🚀 Habit Tracker API is running!");
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

// 🧠 Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
