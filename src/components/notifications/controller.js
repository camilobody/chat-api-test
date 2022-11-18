import service from "./services.js";
import fetch from "node-fetch";

const controller = {}

controller.testNotificationsByUser = (req, res) => {

  const { body: {id_member} } = req;

  service.testNotificationsByUser({id_member: id_member})
  .then((result) => {
    res.send(result);
  })
  .catch((err) => {
    res.status(500).send(err)
  })

}


export default controller;