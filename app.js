import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import cors from 'cors';

const server = express();
server.use(express.json());
server.use(cors());

dotenv.config();

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;
mongoClient.connect(() => {
    db = mongoClient.db("bate_papo_uol")
})


server.post('/participants', async (req, res) => {
  try {
    const name = req.body.name;
    const participant = await db.collection('participants').insertOne({
      name: name,
      lastStatus: Date.now(),
    });
      res.send(201)
  } catch (err) {
    console.log(err);
  }
});

server.get('/participants', async (req, res) => {
  try {
    await participants.deleteMany({});
    const participants = await db.collection('participants').find().toArray();
    res.send(participants);
  } catch (err) {
    console.log(err);
  }
});

server.post('/messages', (req, res) => {});

server.get('/messages', (req, res) => {});

server.post('/status', (req, res) => {});

function checkStatus() {}

server.listen(5000, () => {
    console.log("Listening on port 5000")
});
