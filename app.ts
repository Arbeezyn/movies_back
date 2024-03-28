import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import movieSchema from "./models/Movie";
import User from "./models/User";

const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());
app.use(express.static("uploads"));

// Подключение к базе данных
mongoose
  .connect("mongodb+srv://admin:wwwwww@cluster0.gvhafjn.mongodb.net/movies")
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Failed to connect to MongoDB:", error));

// Инициализация Multer с настройками хранилища для изображений и видео
const uploadFiles = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      if (file.fieldname === "poster") {
        cb(null, "uploads/posters/");
      } else if (file.fieldname === "movie") {
        cb(null, "uploads/movies/");
      }
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + "_" + file.originalname);
    },
  }),
});

// Маршрут для загрузки файла и поля "title"
app.post(
  "/upload",
  uploadFiles.fields([{ name: "poster" }, { name: "movie" }]),
  (req: Request, res: Response) => {
    // Доступ к загруженным данным через req.files и req.body
    const title = req.body.title;
    const description = req.body.description;
    const age = req.body.age;
    const poster = (
      req.files as { [fieldname: string]: Express.Multer.File[] }
    )["poster"][0];
    const movie = (req.files as { [fieldname: string]: Express.Multer.File[] })[
      "movie"
    ][0];

    console.log(
      title,
      description,
      age,
      poster.originalname,
      movie.originalname
    );

    try {
      // Обработка данных (например, сохранение в базе данных)
      const doc = new movieSchema({
        title,
        description,
        age,
        posterUrl: poster.path,
        movieUrl: movie.path,
      });
      doc.save();
    } catch (error) {
      console.error(error);
      res.status(500).send("Произошла ошибка");
    }

    // Обработка данных (например, сохранение в базу данных)

    res.send("Files uploaded successfully");
  }
);

app.get("/movie/video", (req: Request, res: Response) => {
  const filePath = path.join(__dirname, req.body.video);
  res.sendFile(filePath);
});

app.get("/movie/poster", (req: Request, res: Response) => {
  const filePath = path.join(__dirname, req.body.poster);

  res.sendFile(filePath);
});

app.get("/movie/all", async (req, res) => {
  try {
    const sortOrder = req.query.sort || "asc"; // Получаем параметр сортировки из запроса или устанавливаем по умолчанию "asc"
    const data = await movieSchema
      .find()
      .sort({ age: sortOrder === "asc" ? 1 : -1 }); // Сортируем результаты по году в соответствии с выбранным порядком сортировки
    res.json(data);
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/movie/sort", async (req: Request, res: Response) => {
  try {
    const data = await movieSchema.find().sort({ age: -1 });
    res.json(data);
  } catch (error) {
    console.error("Ошибка при сортировке данных:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/movie/:id", async (req: Request, res: Response) => {
  try {
    const data = await movieSchema.findById(req.params.id);
    res.json(data);
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    res.status(500).send("Internal Server Error");
  }
});

//Алгоритм поиска
app.get("/search", async (req, res) => {
  try {
    const query = req.query.query; // Получаем строку запроса из параметра запроса
    const sortOrder = req.query.sort || "asc"; // Получаем параметр сортировки из запроса или устанавливаем по умолчанию "asc"

    // Используем регулярное выражение для поиска фильмов, у которых название содержит указанную строку
    const data = await movieSchema
      .find({
        title: { $regex: query, $options: "i" },
      })
      .sort({ age: sortOrder === "asc" ? 1 : -1 }); // Сортируем результаты по году в соответствии с выбранным порядком сортировки

    res.json(data);
  } catch (error) {
    console.error("Ошибка при поиске данных:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Регистрация пользователя
app.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send("Пользователь с таким именем уже существует");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).send("Пользователь зарегистрирован успешно");
  } catch (error) {
    console.error(error);
    res.status(500).send("Произошла ошибка при регистрации пользователя");
  }
});

// Аутентификация пользователя
app.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send("Пользователь не найден");
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send("Неверный пароль");
    }
    // Если аутентификация прошла успешно, отправляем данные пользователя
    res.status(200).json({ id: user._id, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).send("Произошла ошибка при попытке входа");
  }
});

app.delete("/movie/:id", async (req: Request, res: Response) => {
  try {
    const data = await movieSchema.findByIdAndDelete(req.params.id);
    res.json(data);
  } catch (error) {
    console.error("Ошибка при удалении данных:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
