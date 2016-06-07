var models = require("../models");
exports.view = function(req, res) {
    models.Newsfeed.find({type: 'anxiety'}).sort('posted').exec(displayPosts);

    function displayPosts(err, posts) {
        if (err) {
            console.log(err);
            res.send(500);
            return;
        }
        console.log("Redering Newsfeed");
        res.render('dashboardnew', {'anxiety': posts});
    }
};