import express from "express";
import uploadRouter from "./routes/upload.route.js";

const app = express();

app.get("/health", (_, res) => {
  res.json({
    status: "ok",
  });
});

app.listen(3000, () => {
  console.log("Server started");
});

app.use("/upload", uploadRouter);
