import express from "express";
import Controller from "./controller.js";

const notification = express.Router();

notification.post('/', Controller.testNotificationsByUser)

export default notification;