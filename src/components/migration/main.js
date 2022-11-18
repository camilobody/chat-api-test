import express from "express";
import Controller from "./controller.js";

const migration = express.Router();

migration.post("/", Controller.migration);

export default migration;
