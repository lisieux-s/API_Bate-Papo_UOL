import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import cors from 'cors';
import dayjs from 'dayjs';
import joi from 'joi';

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
  db = mongoClient.db('bate_papo_uol');
});

let activeUser = '';
let activeParticipants = '';

const nameSchema = joi.string().required();

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi
    .string()
    .required()
    .valid(...['message', 'private_message']),
  from: joi.valid(activeParticipants),
});

app.post('/participants', async (req, res) => {
  try {
    const name = req.body.name;
    const participantName = await db
      .collection('participants')
      .find({ name: name })
      .toArray();

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
    res.sendStatus(err);
  }
});

app.get('/participants', async (req, res) => {
  try {
    const participants = await db.collection('participants').find().toArray();
    activeParticipants = participants;
    res.send(participants);
  } catch (err) {
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

    const validation = messageSchema.validate(message, {
      abortEarly: true,
    });

    if (validation.error) {
      res.sendStatus(422);

    } else {
      const messages = await db.collection('messages').insertOne({
        to: to,
        text: text,
        type: type,
        from: from,
        time: time,
      });

      res.sendStatus(201);
    }
  } catch (err) {
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
      res.send(filteredMessages);
      return;
    } else {
      const limit = req.query.limit;
      res.send([...filteredMessages].reverse().slice(0, limit).reverse());
    }
  } catch (err) {
    res.sendStatus(err);
  }
});

app.post('/status', async (req, res) => {
  const participant = await db
      .collection('participants')
      .find({ name: req.headers.user })
      .toArray();
  if(participant.length < 1) {
    res.sendStatus(404)
  } else {
    await db.collection('participants').updateOne({name: participant.name}, {$set: {lastStatus: Date.now()}})
    res.sendStatus(200);
  }
});

setInterval(async () => {
  const timeLimit = Date.now() - 10000
  const inactiveParticipants = await db.collection('participants').find({lastStatus: {$lt: timeLimit}}).toArray()
  await db.collection('participants').deleteMany({lastStatus: {$lt: timeLimit}})

  inactiveParticipants.map(async inactiveParticipant => {
    await db.collection('messages').insertOne({
      from: inactiveParticipant.name,
      to: 'Todos',
      text: 'sai da sala...',
      type: 'status',
      time: dayjs(Date.now()).format('HH:mm:ss')
    })
  })
}, 15000)

app.delete('/messages/:message_id', async (req, res) => {
  const user = req.headers.user;
  const id = req.params.message_id
  const message = await db.collection('messages').find({_id: {$eq: new ObjectId(id)}}).toArray();
  console.log(message)
  console.log(message[0].from)

  if(!message) {
    res.sendStatus(404);
  } else if (message[0].from !== user) {
    res.sendStatus(401)
  } else {
    await db.collection('messages').deleteOne({_id: {$eq: new ObjectId(id)}})
  }
});


app.listen(5000, () => {
  console.log('Listening on port 5000');
});
