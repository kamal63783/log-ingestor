const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const WebSocket = require("ws");

app.use(bodyParser.json());
app.use(cors());

let dbDetails = {};
let client;
let logsCollection;
let wss;

async function connectToDB() {
  try {
    client = new MongoClient(dbDetails.mongoURL);
    await client.connect();

    const db = client.db(dbDetails.dbName);
    logsCollection = db.collection(dbDetails.collectionName);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

function setUpWebSocketServer(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    ws.on("message", (message) => {
      console.log(`Received message: ${message}`);
    });
  });
}

app.post("/", async (req, res) => {
  try {
    if (
      !dbDetails ||
      !dbDetails.mongoURL ||
      !dbDetails.dbName ||
      !dbDetails.collectionName
    ) {
      throw new Error("Incomplete MongoDB configuration");
    }

    const logsToIngest = req.body.logData;
    console.log(logsToIngest);

    if (!Array.isArray(logsToIngest) || logsToIngest.length === 0) {
      throw new Error("Invalid or missing log data");
    }

    await connectToDB();
    await logsCollection.insertMany(logsToIngest);
    const updatedLogs = await logsCollection.find({}).toArray();
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(updatedLogs));
      }
    });

    res.status(200).json({ message: "Logs ingested successfully" });
  } catch (error) {
    console.error("Error ingesting logs:", error);
    res.status(500).json({ error: "Failed to ingest logs" });
  }
});

app.post("/set-config", async (req, res) => {
  const { mongoURL, dbName, collectionName } = req.body;

  if (!mongoURL || !dbName || !collectionName) {
    return res.status(400).json({ error: "Incomplete MongoDB configuration" });
  }

  dbDetails = {
    mongoURL,
    dbName,
    collectionName,
  };
  console.log(dbDetails);
  try {
    const client = new MongoClient(dbDetails.mongoURL);
    await client.connect();
    const db = client.db(dbDetails.dbName);
    const collection = db.collection(dbDetails.collectionName);
    const data = await collection.findOne({});
    const isConnected = !!data;

    if (isConnected) {
      res.status(200).json({
        message: "Database details set successfully. Connected to MongoDB.",
        connected: true,
      });
    } else {
      throw new Error("Failed to establish a connection to MongoDB");
    }
  } catch (error) {
    console.error("Error setting database details:", error);
    res.status(500).json({
      error: "Failed to set database details or establish connection",
      connected: false,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

app.get("/logs", cors(), async (req, res) => {
  try {
    await connectToDB();
    const logs = await logsCollection.find({}).toArray();
    const formattedLogs = logs.map((log) => ({
      level: log.level,
      message: log.message,
      resourceId: log.resourceId,
      timestamp: log.timestamp,
      traceId: log.traceId,
      spanId: log.spanId,
      commit: log.commit,
      metadata: {
        parentResourceId: log.metadata && log.metadata.parentResourceId,
      },
    }));

    const response = JSON.stringify(formattedLogs, null, 2);
    res.set("Content-Type", "application/json").status(200).send(response);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch logs", details: err.message });
  }
});

const DEFAULT_PORT = 3000;
const server = app.listen(DEFAULT_PORT, () => {
  console.log(`Server running on port ${DEFAULT_PORT}`);
  setUpWebSocketServer(server);
});
