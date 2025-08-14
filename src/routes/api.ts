import express, { Router, Request, Response } from "express";
import { middleware } from "../config/middleware";
import ListingController from "../controllers/ListingController";
import { UserController } from "../controllers/UsersController";

const routes: Router = express.Router();
const guardRoutes: Router = express.Router();

// Public routes
routes.post("/login", UserController.login);
routes.post("/register", UserController.register);

// routes.get('/listings', ListingController.getAll);
// routes.post('/listings/create', ListingController.create);
// routes.put('/listings/:id', ListingController.update);
// routes.delete('/listings/:id', ListingController.delete);

// Protected routes
guardRoutes.use(middleware(['user', 'admin']));

guardRoutes.get("/test", (req: Request, res: Response) => {
  res.status(200).json({ message: "Guard test route working!" });
});

guardRoutes.get('/listings', ListingController.getAll);
guardRoutes.post('/listings/create', ListingController.create);
guardRoutes.put('/listings/:id', ListingController.update);
guardRoutes.delete('/listings/:id', ListingController.delete);

guardRoutes.post("/logout", UserController.logout);

routes.use("/", guardRoutes);

export default routes;
