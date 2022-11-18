import service from "./services.js";
import Services from "./services.js";

const controller = {};

controller.channel = (req, res) => {
  const { body } = req;

  Services.channel(body)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.send({ status: 500, ...err });
    });
};

controller.byUser = (req, res) => {
  const {
    query: { id_user },
  } = req;

  Services.byUser(id_user)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.send({
        status: 500,
        ...err,
      });
    });
};

controller.reasign = (req, res) => {
  const { body } = req;
  Services.reassign(body.id_channel, body.id_user, "user reasign")
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.send({
        status: 500,
        ...err,
      });
    });
};

controller.reasignHistory = (req, res) => {
  const {
    query: { id_channel },
  } = req;

  var filter = {};

  if (id_channel) filter.id_channel = id_channel;

  Services.reasignHistory(filter)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
};

controller.update = (req, res) => {
  service
    .update()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.send(err);
    });
};

controller.channels = (req, res) => {
  Services.channels()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    });
};

controller.countChannel = (req, res) => {
  Services.countChannels()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    });
};

export default controller;
