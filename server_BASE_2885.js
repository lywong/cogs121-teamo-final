//dependencies for each module used
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require("socket.io")(http);
var path = require('path');
var handlebars = require('express-handlebars');
var bodyParser = require('body-parser');
var session = require('express-session');
var dotenv = require('dotenv');
var pg = require('pg');
const passport = require("passport");
const MongoStore = require("connect-mongo")(session);
const mongoose = require("mongoose");


dotenv.load();

var models = require("./models");
var db = mongoose.connection;

var router = {
    queryDELPH: require("./routes/queryDELPH"),
    dashboard: require('./routes/dashboard')
};

var parser = {
    body: require("body-parser"),
    cookie: require("cookie-parser")
};

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1/cogs121');
db.on('error', console.error.bind(console, 'Mongo DB Connection Error:'));
db.once('open', function(callback) {
    console.log("Database connected successfully.");
});

var session_middleware = session({
    key: "session",
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true,
    store: new MongoStore({ mongooseConnection: db })
});

app.engine('html', handlebars({
    defaultLayout: 'layout',
    extname: '.html'
}));
app.set("view engine", "html");
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(parser.cookie());
app.use(parser.body.urlencoded({ extended: true }));
app.use(parser.body.json());

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(session({
    secret: 'keyboard cat',
    saveUninitialized: true,
    resave: true
}));

app.use(require('method-override')());
app.use(session_middleware);
/* TODO: Passport Middleware Here*/
app.use(passport.initialize());
app.use(passport.session());


//set environment ports and start application
app.set('port', process.env.PORT || 3000);

TwitterStrategy = require('passport-twitter').Strategy;

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY ,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET ,
    callbackURL: "/auth/twitter/callback"
}, function(token, token_secret, profile, done) {
    // What goes here? Refer to step 4.
    //console.log(profile);
    models.User.findOne({ "twitterID": profile.id }, function(err, user) {
        // (1) Check if there is an error. If so, return done(err);
        if(err) return done(err);

        if(!user) {
            // (2) since the user is not found, create new user.
            var newUser = new models.User({
                "twitterID": profile.id,
                "token": token,
                "username": profile.username,
                "displayName": profile.displayName,
                "photo": profile.photos[0].value
            });

            // Refer to Assignment 0 to how create a new instance of a model
            return done(null, newUser);
        } else {
            // (3) since the user is found, update user's information
            process.nextTick(function() {
                return done(null, user);
            });
        }
    });
}));
/* TODO: Passport serialization here */
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    done(null, user);
});

//routes
app.get('/', function(req, res) {
    res.render('index');
});

app.get('/dashboard', router.dashboard.view);
    // function(req, res) {
    // res.render('dashboard');
// });

app.get('/map_explore', function(req, res) {
    res.render('map_view_google');
});

app.get('/donut', function(req, res) {
    res.render('donut');
});


//race data for donut chart
app.get('/raceData', function(req, res) {
    //connect to DELPHI Database
    var pg = require('pg');
    var conString = process.env.DATABASE_CONNECTION_URL;

    var client = new pg.Client(conString);
    client.connect(function(err) {
        if (err) {
            return console.error('could not connect to postgres', err);

        }
        client.query('SELECT "Geography", "Race", "Year", "Hospitalization No." FROM cogs121_16_raw.hhsa_anxiety_disorder_by_race_2010_2012 AS tableData',
            function(err, result) {
                if (err) {
                    return console.error('error running query', err);
                }

                console.log(result);

                var rawData = result.rows;
                var renderDataRace0 = {};
                var renderDataRace1 = {};
                var renderDataRace2 = {};
                var year = {
                    "2010": [],
                    "2011": [],
                    "2012": []
                };

                for (i = 0; i < rawData.length; i++) {
                    if (rawData[i].Geography === "San Diego County (Actual Rate)") {
                        if (parseInt(rawData[i]["Year"]) == "2010") {
                            renderDataRace0[(rawData[i].Race)] = rawData[i]["Hospitalization No."];
                        }
                        if (parseInt(rawData[i]["Year"]) == "2011") {
                            renderDataRace1[(rawData[i].Race)] = rawData[i]["Hospitalization No."];
                        }
                        if (parseInt(rawData[i]["Year"]) == "2012") {
                            renderDataRace2[(rawData[i].Race)] = rawData[i]["Hospitalization No."];
                        }
                    }
                }
                year["2010"].push(renderDataRace0);
                year["2011"].push(renderDataRace1);
                year["2012"].push(renderDataRace2);

                res.json(year);
                client.end();
            });
    });

    return {
        raceData: "No data present."
    }
});

app.get('/gender_graph', function(req, res) {
    res.render('gender_graph');
});

app.get('/gender_data', function(req, res) {
    //connect to DELPHI Database
    var pg = require('pg');

    var conString = process.env.DATABASE_CONNECTION_URL;

    var client = new pg.Client(conString);
    client.connect(function(err) {
        if (err) {
            return console.error('could not connect to postgres', err);

        }

        client.query('SELECT "Geography", "Year", "Gender", "Hospitalization No." FROM cogs121_16_raw.hhsa_anxiety_disorder_by_gender_2010_2012 WHERE "Geography" LIKE \'%Actual Rate%\'',
            function(err, result) {
                if (err) {
                    return console.error('error running query', err);
                }

                var rawData = result.rows;

                var renderGender0 = {};
                var renderGender1 = {};
                var renderGender2 = {};
                var year = {
                    "2010": [],
                    "2011": [],
                    "2012": []
                };

                for (i = 0; i < rawData.length; i++) {
                    if (rawData[i].Geography === "San Diego County (Actual Rate)") {
                        if (parseInt(rawData[i]["Year"]) == "2010") {
                            renderGender0[(rawData[i].Gender)] = rawData[i]["Hospitalization No."];
                        }
                        if (parseInt(rawData[i]["Year"]) == "2011") {
                            renderGender1[(rawData[i].Gender)] = rawData[i]["Hospitalization No."];
                        }
                        if (parseInt(rawData[i]["Year"]) == "2012") {
                            renderGender2[(rawData[i].Gender)] = rawData[i]["Hospitalization No."];
                        }
                    }
                }
                year["2010"].push(renderGender0);
                year["2011"].push(renderGender1);
                year["2012"].push(renderGender2);

                console.log(year["2010"][0]);

                res.json(year);
                client.end();
                //return { delphidata: result };
            });
    });

    return {
        delphidata: "No data present."
    }
});


app.get('/age', function(req, res) {
    res.render('age');
});

app.get('/ageData', function(req, res) {
    var pg = require('pg');
    var conString = process.env.DATABASE_CONNECTION_URL;

    var client = new pg.Client(conString);
    client.connect(function(err) {
        if (err) {
            return console.error('could not connect to postgres', err);

        }
        client.query('SELECT "Geography", "Year", "Age", "Hospitalization No." FROM cogs121_16_raw.hhsa_anxiety_disorder_by_age_2010_2012 AS tableData',
            function(err, result) {
                if (err) {
                    return console.error('error running query', err);
                }


                var rawData = result.rows;

                var data = [];

                for (i = 0; i < rawData.length; i++) {

                    var eachForm =  {
                        geo: [],
                        labels: ["0-14", "15-24", "25-44", "45-64", "65+"],
                        series: [
                            {
                                label: '2010',
                                values: []
                            },
                            {
                                label: '2011',
                                values: []
                            },
                            {
                                label: '2012',
                                values: []
                            }]
                    }

                    var e = rawData[i].Geography;
                    eachForm["geo"] = e;
                    //console.log(e);
                    // if (rawData[i].Geography === "San Diego County (Actual Rate)") {
                        if (parseInt(rawData[i]["Year"]) == "2010") {
                            var a = rawData[i]["Hospitalization No."];
                            if (a == "<5") {
                                a = 5;
                            }
                            if (a == NaN) {
                                a = 0;
                            }

                            if (rawData[i]["Age"] == "0-14") {
                               eachForm["series"][0]["values"][0] = a;
                            }

                            if (rawData[i]["Age"] == "15-24") {
                                eachForm["series"][0]["values"][1] = a;
                            }

                            if (rawData[i]["Age"] == "25-44") {
                                eachForm["series"][0]["values"][2] = a;
                            }

                            if (rawData[i]["Age"] == "45-64") {
                                eachForm["series"][0]["values"][3] = a;
                            }

                            if (rawData[i]["Age"] == "65+") {
                                eachForm["series"][0]["values"][4] = a;
                            }
                        }


                        if (parseInt(rawData[i]["Year"]) == "2011") {
                            var a = rawData[i]["Hospitalization No."];
                            if (a == "<5") {
                                a = 5;
                            }

                            if (a == NaN) {
                                a = 0;
                            }
                            if (rawData[i]["Age"] == "0-14") {
                                eachForm["series"][1]["values"][0] = a;
                            }

                            if (rawData[i]["Age"] == "15-24") {
                                eachForm["series"][1]["values"][1] = a;
                            }

                            if (rawData[i]["Age"] == "25-44") {
                                eachForm["series"][1]["values"][2] = a;
                            }

                            if (rawData[i]["Age"] == "45-64") {
                                eachForm["series"][1]["values"][3] = a;
                            }

                            if (rawData[i]["Age"] == "65+") {
                                eachForm["series"][1]["values"][4] = a;
                            }
                        }
                        if (parseInt(rawData[i]["Year"]) == "2012") {
                            var a = rawData[i]["Hospitalization No."];
                            if (a == "<5") {
                                a = 5;
                            }
                            if (a == NaN) {
                                a = 0;
                            }
                            if (rawData[i]["Age"] == "0-14") {
                                eachForm["series"][2]["values"][0] = a;
                            }

                            if (rawData[i]["Age"] == "15-24") {
                                eachForm["series"][2]["values"][1] = a;
                            }

                            if (rawData[i]["Age"] == "25-44") {
                                eachForm["series"][2]["values"][2] = a;
                            }

                            if (rawData[i]["Age"] == "45-64") {
                                eachForm["series"][2]["values"][3] = a;
                            }

                            if (rawData[i]["Age"] == "65+") {
                                eachForm["series"][2]["values"][4] = a;
                            }


                        }
                    //}
                    //series["2010"].push(renderDataRace2010);
                    data[i] = eachForm;

                }
                console.log(data);
                res.json(data);
                client.end();
            });
    });


    return {
        raceData: "No data present."
    }
});


app.get('/map_anxiety_rate', router.queryDELPH.map_anxiety_rate);

// More routes here if needed
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback',
    passport.authenticate('twitter', { successRedirect: '/homepage',
        failureRedirect: '/login' }));
app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});
io.use(function(socket, next) {
    session_middleware(socket.request, {}, next);
});

/* TODO: Server-side Socket.io here */
io.on('connection', function(socket) {
    socket.on('newsfeed', function(msg) {
        try {
            var user = socket.request.session.passport.user;
        } catch(err) {
            console.log("no user authenticated");
            return;
        }

        var newNewsfeed = new models.Newsfeed({
            'type': 'chat',
            'user': user.username,
            'photo': user.photo,
            'message': msg,
            'posted': Date.now(),
        });

        newNewsfeed.save(saved);
        function saved(err) {
            if(err) {
                console.log(err);
                return;
            }
            io.emit('newsfeed', JSON.stringify(newNewsfeed));
        }
    });

    socket.on('anxiety', function(msg) {
        try {
            var user = socket.request.session.passport.user;
        } catch(err) {
            console.log("no user authenticated");
            return;
        }

        console.log("HERE!!!!!!!");

        var newAnxietyPost = new models.Newsfeed({
            'type': 'anxiety',
            'user': user.username,
            'photo': user.photo,
            'message': msg,
            'posted': Date.now(),
        });

        newAnxietyPost.save(saved);
        function saved(err) {
            if(err) {
                console.log(err);
                return;
            }
            io.emit('anxiety', JSON.stringify(newAnxietyPost));
        }
    });

    socket.on('depressed', function(msg) {
        try {
            var user = socket.request.session.passport.user;
        } catch(err) {
            console.log("no user authenticated");
            return;
        }

        var newDepressedPost = new models.Newsfeed({
            'type': 'depressed',
            'user': user.username,
            'photo': user.photo,
            'message': msg,
            'posted': Date.now(),
        });

        newDepressedPost.save(saved);
        function saved(err) {
            if(err) {
                console.log(err);
                return;
            }
            io.emit('depressed', JSON.stringify(newDepressedPost));
        }
    });

    socket.on('stressed', function(msg) {
        try {
            var user = socket.request.session.passport.user;
        } catch(err) {
            console.log("no user authenticated");
            return;
        }

        var newStressedPost = new models.Newsfeed({
            'type': 'stressed',
            'user': user.username,
            'photo': user.photo,
            'message': msg,
            'posted': Date.now(),
        });

        newStressedPost.save(saved);
        function saved(err) {
            if(err) {
                console.log(err);
                return;
            }
            io.emit('stressed', JSON.stringify(newStressedPost));
        }
    });


    socket.on('lonely', function(msg) {
        try {
            var user = socket.request.session.passport.user;
        } catch(err) {
            console.log("no user authenticated");
            return;
        }

        var newLonelyPost = new models.Newsfeed({
            'type': 'lonely',
            'user': user.username,
            'photo': user.photo,
            'message': msg,
            'posted': Date.now(),
        });

        newLonelyPost.save(saved);
        function saved(err) {
            if(err) {
                console.log(err);
                return;
            }
            io.emit('lonely', JSON.stringify(newLonelyPost));
        }
    });

    socket.on('meetup', function(msg) {
        try {
            var user = socket.request.session.passport.user;
        } catch(err) {
            console.log("no user authenticated");
            return;
        }

        var newMeetupPost = new models.Newsfeed({
            'type': 'meetup',
            'user': user.username,
            'photo': user.photo,
            'message': msg,
            'posted': Date.now(),
        });

        newMeetupPost.save(saved);
        function saved(err) {
            if(err) {
                console.log(err);
                return;
            }
            io.emit('meetup', JSON.stringify(newMeetupPost));
        }
    });


    socket.on('support', function(msg) {
        try {
            var user = socket.request.session.passport.user;
        } catch(err) {
            console.log("no user authenticated");
            return;
        }

        var newSupportPost = new models.Newsfeed({
            'type': 'support',
            'user': user.username,
            'photo': user.photo,
            'message': msg,
            'posted': Date.now(),
        });

        newSupportPost.save(saved);
        function saved(err) {
            if(err) {
                console.log(err);
                return;
            }
            io.emit('support', JSON.stringify(newSupportPost));
        }
    });

});


http.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});