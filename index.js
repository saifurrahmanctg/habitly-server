const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://habitlyDB:S2oLp9Rtgmlh5Oio@cluster0.vnhtgsv.mongodb.net/?appName=Cluster0";

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

    const db = client.db("habit-db");
    const habitsCollection = db.collection("habits");

    app.get("/habits", async (req, res) => {
      const habits = await habitsCollection.find().toArray();
      res.send(habits);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running, Fine!");
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
