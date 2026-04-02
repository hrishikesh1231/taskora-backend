// // middleware/isLoggedIn.js
// module.exports.isLoggedIn = (req, res, next) => {
//     if (!req.isAuthenticated()) {
//         req.session.redirectUrl = req.originalUrl;
//         return res.status(401).json({ error: "You must be logged in first!" });
//     }
//     next();
// };


// middleware/isLoggedIn.js
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        return res.status(401).json({ error: "You must be logged in first!" });
    }
    next();
};

