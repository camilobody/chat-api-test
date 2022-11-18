import Service from "./service.js";

const controller = {};

controller.migration = (req, res) => {
  Service.migration()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.send(err);
    });
};

export default controller;
