import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import endPoint from "../routes/api";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", endPoint);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
