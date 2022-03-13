const express = require('express');
const path = require('path');
const request = require('request');
const http = require('http');
const bodyParser = require('body-parser');
const handlebars = require('express-handlebars');
const { stat } = require('fs');
const { response } = require('express');
const bartAPIKey = 'MW9S-E7SL-26DU-VV8V';

const PORT = process.env.PORT || 2400;

// declaring express app
app = express();

// engine setup
// app.engine('handlebars', handlebars.engine);
app.engine('handlebars', handlebars({ extname: 'handlebars', defaultLayout: 'index', layoutsDir: path.join(__dirname + '/views/layouts/') }));
app.set('view engine', 'handlebars');
app.set('port', PORT);
app.set('views', path.join(__dirname + '/views'));
app.use("/styles", express.static(__dirname + '/styles'));
app.use("/javascript", express.static(__dirname + '/javascript'));
app.use("/images", express.static(__dirname + '/images'));

app.use(express.static('public'));

// for constants in the .env file
require('dotenv').config();

// enabling cors - part 5 same-origin policy
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// function to return time difference between two times 
function timeToTrain(originTimeTrainHour, originTimeTrainMinute, originTimeTrainSecond, originTimeTrainAmPm) {
    var currentTime = new Date().toLocaleTimeString();
    currentTime = currentTime.replace(/\s/g, ':');

    const [hour, minute, second, amPm] = currentTime.split(':');
    resultMinute = originTimeTrainMinute - minute;

    var resultTotalTime = (parseInt(resultMinute) * 60) + parseInt(second);
    
    return parseInt(resultTotalTime);
}

// home which renders a simple home page
app.get('/', (req, res) => {
    res.render('home');
});

// stations endpoint will send the list of all stations to handlebars via context and will render the statsions.handlebars view
app.get('/stations', (req, res) => {
    let context = {};

    // all station information
    request('http://api.bart.gov/api/stn.aspx?cmd=stns&key=' + bartAPIKey + '&json=y', function (err, response, body) {
        if (!err && response.statusCode < 400) {
            let contextStation = JSON.parse(body);
            context.stations = contextStation.root.stations.station;

            // console.log('/stations - all stations were sent to handlebars')
            res.render('stations', context);
        } else {
            res.status(400).send({
                message: 'no station was send by BART API'
            });
        }
    })
    // console.log('/stations END');
});

// station access details - first send all the stations, then based on req.query get stations
app.get('/station', function (req, res, next) {
    let context = {};

    // all station information
    request('http://api.bart.gov/api/stn.aspx?cmd=stns&key=' + bartAPIKey + '&json=y', function (err, response, body) {
        if (!err && response.statusCode < 400) {
            let contextStation = JSON.parse(body);
            context.stations = contextStation.root.stations.station;
            // console.log('HERE');
            // console.log(req.query.stn);
            if (req.query.stn) {
                // station access information 
                request('http://api.bart.gov/api/stn.aspx?cmd=stnaccess&orig=' + req.query.stn + '&key=' + bartAPIKey + '&json=y', function (err, response, body) {
                    if (!err && response.statusCode < 400) {
                        let accessStation = JSON.parse(body);
                        context.access = accessStation.root.stations.station;

                        res.render('station', context);
                        // console.log(context);
                        // console.log('/station - station was requested');
                    } else {
                        res.status(400).send({
                            message: 'no station was sent by BART API HERE 1'
                        });
                        next(err);
                    }
                });
            } else {
                res.render('station', context);
                // console.log(context);
                // console.log('/station - no station was requested');
            }
        } else {
            res.status(400).send({
                message: 'no station was sent by BART API HERE 2'
            });
            next(err);
        }
    });
    // console.log('/station END');
});

// trip will plan trip based on source and destination - first send all the stations and then based on source and destination respond with trip
// output context JSON will have stations, tripResponse, sourceLatLng, destinationLatLng, and countdownToTrain
app.get('/trips', function (req, res, next) {
    let context = {};
    let source = req.query.source;
    let destination = req.query.destination;

    request('http://api.bart.gov/api/stn.aspx?cmd=stns&key=' + bartAPIKey + '&json=y', function (err, response, body) {
        if (!err && response.statusCode < 400) {
            let contextStation = JSON.parse(body);
            context.stations = contextStation.root.stations.station;

            // console.log('HERE');
            // console.log(req.query.source);
            // console.log(req.query.destination);

            if (source !== undefined && destination !== undefined) {
                request('http://api.bart.gov/api/sched.aspx?cmd=depart&key=' + bartAPIKey + '&orig=' + source + '&dest=' + destination + '&date=now&b=0&a=4&l=1&json=y', function (err, response, body) {
                    if (!err && response.statusCode < 400) {
                        let contextTrip = JSON.parse(body);
                        context.tripResponse = contextTrip.root.schedule.request; // .root.schedule; // .stations.station;
                        // console.log(context.tripResponse.trip[0]['@fare']);
                        // console.log(context.tripResponse.trip[0].leg);
                        for (var iterator in context.stations) {
                            if (context.stations[iterator].abbr == source) {
                                sourceLatLngJSON = {
                                    sourceLat: context.stations[iterator].gtfs_latitude,
                                    sourceLng: context.stations[iterator].gtfs_longitude
                                }; 
                            } else if (context.stations[iterator].abbr == destination) {
                                destinationLatLngJSON = {
                                    destinationLat: context.stations[iterator].gtfs_latitude,
                                    destinationLng: context.stations[iterator].gtfs_longitude
                                }
                            }
                        }
                        context.sourceLatLng = sourceLatLngJSON;
                        context.destinationLatLng = destinationLatLngJSON;

                        // console.log(context.tripResponse.trip[0]['@origTimeMin']);
                        var originTimeTrain = context.tripResponse.trip[0]['@origTimeMin'];
                        var originTimeTrainDate = context.tripResponse.trip[0]['@origTimeDate'];
                        originTimeTrain = originTimeTrain.replace(/\s/g, ':');
                        const [originTimeTrainHour, originTimeTrainMinute, originTimeTrainAmPm] = originTimeTrain.split(':');
                        originTimeTrainSecond = '00';

                        var resultTimeToTrain = timeToTrain(originTimeTrainHour, originTimeTrainMinute, originTimeTrainSecond, originTimeTrainAmPm);

                        resultTimeToTrainJSON = {
                            originTimeTrainHourJSON: originTimeTrainHour,
                            originTimeTrainMinuteJSON: originTimeTrainMinute,
                            originTimeTrainSecondJSON: originTimeTrainSecond,
                            originTimeTrainAmPmJSON: originTimeTrainAmPm,
                            originTimeTrainDate: originTimeTrainDate
                        }
                        
                        context.countdownToTrain = resultTimeToTrainJSON;

                        res.render('trips', context);
                        // console.log('/trips - source and destination were specified');
                    } else {
                        res.status(400).send({
                            message: 'no station was sent by BART API HERE 1'
                        });
                        next(err);
                    }
                });
            } else {
                // context = body.root.stations.station;
                // console.log(context);
                res.render('trips', context);
                // console.log('/trips - no source and destination were specified');
            }
        } else {
            res.status(400).send({
                message: 'no station was sent by BART API HERE 2'
            });
            next(err);
        }
    });
    // console.log('/trips END');
});

app.listen(PORT, function () {
    console.log('Listening on port ', PORT);
});
