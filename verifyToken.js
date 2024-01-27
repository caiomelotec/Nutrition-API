const jwt = require("jsonwebtoken");

function verifytoken(req, res, next) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res.status(401).send({ message: "Authorization header missing" });
  }

  const token = authorizationHeader.split(" ")[1];

  jwt.verify(token, "jwtkey", (err, data) => {
    if (err) {
      return res.status(401).send({ message: "Token is invalid" });
    }
    // Token is valid, proceed to the route
    next();
  });
}

module.exports = verifytoken;
