import dotenv from "dotenv";
import serverless from "serverless-http";
import express from "express";
import cors from "cors";
import endPoint from "../routes/api";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", endPoint);

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

export default serverless(app);
