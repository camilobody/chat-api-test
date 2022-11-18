import express from "express";
import Controller from "./controller.js";

const users = express.Router();

users.post("/", Controller.addUser);
users.get("/", Controller.getUsers);
users.get("/active", Controller.getUserActivate);
users.post("/change-status", Controller.changeSatus);
users.get("/count-users", Controller.countUsers);

export default users;
