import Services from "./services.js";

const controller = {};

controller.getByChannel = (req, res) => {
  const {
    query: { id_channel },
  } = req;

  Services.getByChannel(id_channel)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.send(err);
    });
};

controller.addMessages = (req, res) => {
  const { files, body } = req;

  let file = null;
  if (files && files.length > 0) {
    file = files[0];
  }

  Services.addMessages(body, file)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.send({ status: 500, err: err });
    });
};

controller.Messages = (req, res) => {
  Services.getMessages({})
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    });
};

controller.MessagesPaginate = (req, res) => {
  const {
    query: { limit, page, id_channel },
  } = req;

  var filter = {};

  if (id_channel) filter.id_channel = id_channel;

  Services.getMessagesPaginate(filter, req, parseInt(limit), parseInt(page))
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    });
};

controller.countMessages = (req, res) => {
  var filter = {};

  Services.countMessages(filter)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    });
};

export default controller;
