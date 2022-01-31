import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import cors from 'cors';
import dayjs from 'dayjs';
import joi from 'joi';

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();

const mongoClient = new MongoClient('mongodb://localhost:27017');
let db;
mongoClient.connect(() => {
  db = mongoClient.db('bate_papo_uol');
});

let activeUser = '';

const nameSchema = joi.string().required();

const schema = joi.object({
  to: joi.string().required(),
  type: joi.string().required(),
  //from: joi.string()
});

app.post('/participants', async (req, res) => {
  try {
    const name = req.body.name;
    const participantName = await db
      .collection('participants')
      .find({ name: name })
      .toArray();
    console.log(participantName);

    const validation = nameSchema.validate(name, { abortEarly: true });
    if (validation.error) {
      res.sendStatus(422);
    } else if (participantName.length > 0) {
      res.sendStatus(409);
    } else {
      const participant = await db.collection('participants').insertOne({
        name: name,
        lastStatus: Date.now(),
      });
      const message = await db.collection('messages').insertOne({
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs(Date.now()).format('HH:mm:ss'),
      });

      activeUser = name;
      res.sendStatus(201);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(err);
  }
});

app.get('/participants', async (req, res) => {
  try {
    const participants = await db.collection('participants').find().toArray();
    res.send(participants);
  } catch (err) {
    console.log(err);
    res.sendStatus(err);
  }
});

app.post('/messages', async (req, res) => {
  try {
    const message = req.body;

    const to = req.body.to;
    const text = req.body.text;
    const type = req.body.type;
    const from = req.headers.user;
    const time = dayjs(Date.now()).format('HH:mm:ss');
    //FRONT ISSUE? TIMESTAMP SOMETIMES DOES NOT APPEAR, ALONG WITH EDIT/DELETE ICONS

    const messages = await db.collection('messages').insertOne({
      to: to,
      text: text,
      type: type,
      from: from,
      time: time,
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(err);
  }
});

app.get('/messages', async (req, res) => {
  try {
    const messages = await db.collection('messages').find().toArray();
    const filteredMessages = messages.filter(
      (message) =>
        message.to === 'Todos' ||
        message.to === activeUser ||
        message.from === activeUser
    );

    if (!req.query.limit) {
      console.log('sem limites vei');
      res.send(filteredMessages);
      return;
    } else {
      const limit = req.query.limit;
      res.send([...filteredMessages].reverse().slice(0, limit).reverse());
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(err);
  }
});

app.post('/status', (req, res) => {
  //primeiro fazer validacao dos usuarios
});

function checkStatus() {}

app.listen(5000, () => {
  console.log('Listening on port 5000');
});
