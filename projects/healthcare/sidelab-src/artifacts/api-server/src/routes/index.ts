import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cdssRouter from "./cdss";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cdssRouter);

export default router;
