import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import joi from "joi";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("mywallet");
});

const registrationScrema = joi.object({
  name: joi.string().required(),
  password: joi.string().pattern(new RegExp("^[a-zA-Z0-9]{8,30}$")).required(),
  email: joi.string().email().required(),
  repeat_password: joi.ref("password"),
});

const loginScrema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().pattern(new RegExp("^[a-zA-Z0-9]{8,30}$")).required(),
});

server.post("/sign-up", async (req, res) => {
  const { name, password, email, repeat_password } = req.body;
  const user = req.body;

  const validation = registrationScrema.validate(
    {
      name,
      password,
      email,
      repeat_password,
    },
    { abortEarly: true }
  );

  if (validation.error) return res.status(404).send(validation.error.details);

  try {
    const UserExistenceName = await db
      .collection("users")
      .find({ name })
      .toArray();
    const UserExistenceEmail = await db
      .collection("users")
      .find({ email })
      .toArray();

    if (UserExistenceName.length === 0 && UserExistenceEmail.length === 0) {
      const hashPassword = bcrypt.hashSync(user.password, 12);
      delete user.password;
      delete user.repeat_password;

      await db.collection("users").insertOne({
        ...user,
        password: hashPassword,
      });

      return res.send("User created sucessfully");
    }

    res.status(409).send("Nome ou Email já existente");
  } catch (error) {
    res.status(500).send(error);
  }
});

server.post("/sign-in", async (req, res) => {
  const { email, password } = req.body;

  const validation = loginScrema.validate(
    {
      email,
      password,
    },
    { abortEarly: true }
  );

  if (validation.error)
    return res
      .status(404)
      .send(validation.error.details.map((erro) => erro.message));

  try {
    const user = await db.collection("users").findOne({ email });
    const { name, _id } = user;

    if (user) {
      const isValid = bcrypt.compareSync(password, user.password);

      if (!isValid) return res.status(401).send("Senha incorreta");

      const token = uuidv4();

      db.collection("sessions").deleteOne({ userId: _id });
      db.collection("sessions").insertOne({
        token,
        userId: _id,
      });

      return res.send({
        name,
        token,
        userId: _id,
      });
    }
    return res.status(404).send("Usuário não encontrado");
  } catch (error) {
    res.status(500).send(error);
  }
});

server.get("/cashflow", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401);
  }

  try {
    // const user = await db.collection("sessions").findOne({ token });
    // console.log(user.userId);
    // const transacoes = await db.collection("cashlist").findMany({ userId: "631f5ac54bcca2e58cdcc3b6"}).toArray();
    // console.log(transacoes);
    return res.status(200).send("");
  } catch (error) {
    res.status(500).send(error);
  }
  return res.status(200).send("");
});

server.post("/cashin", async (req, res) => {
  const { value, description } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401);
  }

  try {
    const session = await db.collection("sessions").findOne({ token });
    await db.collection("cashlist").insertOne({
      value,
      description,
      type: "cashIn",
      userId: session.userId,
    });
  } catch (error) {
    res.status(500).send(error);
  }
  return res.send(200);
});

server.post("/cashout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401);
  }

  try {
  } catch (error) {
    res.status(500).send(error);
  }
  return res.send(200);
});

server.listen(5000, () => console.log(`App running in port: 5000`));
