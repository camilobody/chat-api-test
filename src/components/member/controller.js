import Services from "./services.js";

const controller = {};

controller.addMember = (req, res) => {
  const { body } = req;

  Services.addMember(body)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    });
};

controller.countMembers = (req, res) => {
  Services.countMember()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    });
};

controller.members = (req, res) => {
  Services.members()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(err);
      res.send(err);
    });
};

controller.filter = (req, res) => {
  Services.filter()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.send(err);
    });
};

export default controller;
