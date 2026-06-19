import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import registerRouter from "./register";
import profileRouter from "./profile";
import opportunitiesRouter from "./opportunities";
import forumsRouter from "./forums";
import interestsRouter from "./interests";
import notificationsRouter from "./notifications";
import messagesRouter from "./messages";
import usersRouter from "./users";
import hubsRouter from "./hubs";
import moneyManagementRouter from "./moneyManagement";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(registerRouter);
router.use(profileRouter);
router.use(opportunitiesRouter);
router.use(forumsRouter);
router.use(interestsRouter);
router.use(notificationsRouter);
router.use(messagesRouter);
router.use(usersRouter);
router.use(hubsRouter);
router.use(moneyManagementRouter);

export default router;
