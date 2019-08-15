/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const requestProm = require('request-promise');
require('dotenv').config();


const CLIENT_ID = process.env.CLIENT_ID; // Your client id
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Your secret
const PORT = process.env.PORT || 8888;
const REDIRECT_URI_FIRST = 'http://localhost:8888/callback'; // Your redirect uri
const REDIRECT_URI_SECOND = 'http://localhost:8888/secondMusic';
const API_ENDPOINT = `https://api.spotify.com`;
const PAGE_SIZE = 50; // How many records the API returns in a page.

var access_token_global = ''; // TO DO don't keep it global and ahrd coded!!
// end of added by IRF

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());

// Database IRF

// start added by IRF
var mongoUri = process.env.MONGODB_URI;
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var db = MongoClient.connect(mongoUri, {useNewUrlParser: true}, function(error, databaseConnection) {
    console.log("in monogodb connection!!!");
	db = databaseConnection.db('musicTasteDB');
    const collection = db.collection('firstUser');
    collection.insertOne({name: 'Roger'}, (err, result) => {
        console.log("we in here");
    })

    collection.findOne({name: 'Roger'}, (err, item) => {
        //console.log(item)
    })
});

const getTopArtists = async () => {
    console.log("in get top artsts")
    const topRequest = {
        url: `https://api.spotify.com/v1/me/top/artists?limit=5`,
        json: true,
        headers: { 'Authorization': 'Bearer ' + access_token_global },
    };

    try {
        let payload = await requestProm(topRequest);
        return payload;
    } catch(err) {
        console.log("Error in getTopArtists");
    }
}


function storeInDb(data) {
    console.log("in store function");
    var mongoUri = process.env.MONGODB_URI;
    var MongoClient = require('mongodb').MongoClient, format = require('util').format;
    var db = MongoClient.connect(mongoUri, {useNewUrlParser: true}, function(error, databaseConnection) {
        console.log("in monogodb connection!!!");
    	db = databaseConnection.db('musicTasteDB');
        const collection = db.collection('firstUser');
        collection.insertOne(data, (err, result) => {
            console.log("we in here function");
        })
    });
}

async function getFromDb(callback) {
    console.log("in get function");
    var mongoUri = process.env.MONGODB_URI;
    var MongoClient = require('mongodb').MongoClient, format = require('util').format;
    var db = MongoClient.connect(mongoUri, {useNewUrlParser: true}, function(error, databaseConnection) {
        console.log("in monogodb connection!!!");
    	db = databaseConnection.db('musicTasteDB');
        const collection = db.collection('firstUser');
        collection.find({}).toArray(function(err, result) {
            if (err) throw err;
            callback(result);
        });
    });
}

function deleteCollection() {
    console.log("in get function");
    var mongoUri = process.env.MONGODB_URI;
    var MongoClient = require('mongodb').MongoClient, format = require('util').format;
    var db = MongoClient.connect(mongoUri, {useNewUrlParser: true}, function(error, databaseConnection) {
        console.log("in monogodb connection!!!");
    	db = databaseConnection.db('musicTasteDB');
        db.listCollections().toArray(function(err, collInfos) {
            console.log(collInfos);
            for (var i = 0; i < collInfos.length; i++) {
                if (collInfos[i].name == 'firstUser') {
                    console.log("YEAHHH it's here");
                    const collection = db.collection('firstUser');
                    collection.drop(function(err, delOK) {
                        if (err) throw err;
                        if (delOK) console.log("Collection deleted");
                    });
                    db.listCollections().toArray(function(err, collInfos) {
                        console.log(collInfos);
                    });
                } else {
                    console.log("NOPE");
                }
            }
        });
        // const collection = db.collection('SpotifyUser');
        // collection.drop(function(err, delOK) {
        //     if (err) throw err;
        //     if (delOK) console.log("Collection deleted");
        // });
    });
}

const getAlbums = async () => {
    let allAlbums = [];
    let keepGoing = true;
    let offset = 0;
    while (keepGoing) {
        console.log("in keepGoing");
        let response = await reqAlbums(offset);
        console.log("response length: ", response.items.length);
        allAlbums.push(response);
        offset += 50;
        if (response.items.length < PAGE_SIZE) {
            console.log("response < page size ", response.items.length,"   ", PAGE_SIZE);
            keepGoing = false;
            await Promise.all(allAlbums);
            return allAlbums;
        }
    }
}

const reqAlbums = async (offset) => {
    const albumRequest = {
        url: `${API_ENDPOINT}/v1/me/albums?offset=${offset}&limit=50`,
        json: true,
        headers: { 'Authorization': 'Bearer ' + access_token_global },
        data: {
            limit: 50
        }
    };

    try {
        let payload = await requestProm(albumRequest);
        return payload;
    } catch(err) {
        console.log("Error in reqAlbums");
    }
}

app.get('/loginFirst', function(req, res) {
    deleteCollection();

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email user-library-read user-top-read';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI_FIRST,
            state: state,
            show_dialog: true
        }));
});

// IRF
app.get('/loginSecond', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email user-library-read user-top-read';
    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI_SECOND,
        state: state,
        show_dialog: true
    }));
});

app.get('/albumsFirst', function(req, res) {
    (async () => {
        try {
            console.log("in the asycn func");
            allAlbums = await getAlbums(); // IRF this is the call

            console.log(`Total length of users is ${allAlbums.length}`);
            for (var i = 0; i < allAlbums.length; i++) {
                console.log("next album set");
                console.log("myNumAlbums: ", allAlbums[i].items.length);
                for (var j = 0; j < allAlbums[i].items.length; j++) {
                    console.log(allAlbums[i].items[j].album.name);
                    console.log(allAlbums[i].items[j].album.name + " by " + allAlbums[i].items[j].album.artists[0].name);
                }
            }

            var albumsObject = loadRelevantDataToObject(allAlbums);
            var data = {'firstUser': albumsObject};
            storeInDb(data);

            var top5First = await getTopArtists();
            console.log("Top artists: ")
            var top5FirstList = []
            for (var i = 0; i < top5First.items.length; i++) {
                console.log(top5First.items[i].name);
                top5FirstList.push(top5First.items[i].name);
            }

            res.render('top5First', {top5List: top5FirstList});
        }
        catch (e) {
            console.log("error in albumsFirst ", e);
        }
    })();
});


function getSimilarAlbums(firstAlbums, secondAlbums) {
    var simCount = 0;
    var similarAlbums = [];

    for (var key in secondAlbums) {
        // skip loop if the property is from prototype
        if (!secondAlbums.hasOwnProperty(key)) continue;

        var val = secondAlbums[key];
        console.log("key: ", key, "val: ", val);

        if (firstAlbums[key]) {
            console.log("SIMILAR ONE!!!!!!      ", firstAlbums[key].name);
            simCount += 1;
            similarAlbums.push(firstAlbums[key]);
        }
    }
    var firstSize = Object.keys(firstAlbums).length;
    console.log("size fo first!! ", firstSize);
    var secondSize = Object.keys(secondAlbums).length;
    console.log("size of second: ", secondSize);
    var denom = Math.max(Object.keys(firstAlbums).length, Object.keys(secondAlbums).length);
    console.log("denom: ", denom);
    console.log("PRINTING SIMILAR!!! . . .. . . .. . .. . .", simCount);
    var percentage = Math.round(simCount / denom * 100 * 100) / 100;
    //var percentage = simCount / denom * 100;
    console.log("percentage!!!!!!!!!!!!!!", percentage, "%");
    for (var x = 0; x < similarAlbums.length; x++) {
        console.log(similarAlbums[x].name + " by " + similarAlbums[x].artist);
    }

    return {percentSimilar: percentage, similarList: similarAlbums};
}

// function loadRelevantDataToObject(allAlbums, callback) {
function loadRelevantDataToObject(allAlbums) {
    var albumsObject = {};
    var pages = allAlbums.length;
    console.log("pages in load!!! ", pages);
    for (var i = 0; i < pages; i++) {
        console.log("responses on this page! ", allAlbums[i].items.length);
        for (var j = 0; j < allAlbums[i].items.length; j++) {
            var value = {
                name: allAlbums[i].items[j].album.name,
                artist: allAlbums[i].items[j].album.artists[0].name,
            }
            albumsObject[allAlbums[i].items[j].album.id] = value;
        }
    }
    //callback(albumsObject);
    return albumsObject;
}

app.get('/top5Second', function(req, res) {
    (async () => {
        try {
            var top5Second = await getTopArtists();
            console.log("Top artists: ")
            var top5SecondList = []
            for (var i = 0; i < top5Second.items.length; i++) {
                console.log(top5Second.items[i].name);
                top5SecondList.push(top5Second.items[i].name);
            }

            res.render('top5Second', {top5List: top5SecondList});
        } catch (e) {
            console.log("Error in top5Second: ", e);
        }
    })();
});

app.get('/albumsSecond', function(req, res) {
    (async () => {
        try {
            console.log("in the asycn func 22222222222");
            //allAlbums2 = await getAlbums(); // IRF this is the call

            getFromDb(async function(result) {
                //console.log("HERE WE GO RESULT: ", result);
                var albumsObject1 = result[0].firstUser;
                allAlbums2 = await getAlbums();
                var albumsObject2 = loadRelevantDataToObject(allAlbums2);
                console.log("first as obj: ", albumsObject1);
                console.log("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ MIDDEL ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~");
                console.log("second albyms!!!!: ", albumsObject2);

                var results = getSimilarAlbums(albumsObject1, albumsObject2);
                res.render('results', {percentage: results.percentSimilar, similarList: results.similarList});
            });

            // var path = require('path');
            // res.sendFile('results.html', { root: path.join(__dirname, 'public') });

            //res.render('/public/results.html');
            //res.render(__dirname + '/public/results.html', {name:'isabella'});
            //res.render('results.html', { root: path.join(__dirname, 'public') });


        }
        catch (e) {
            console.log("error in albumsSecond ", e);
        }
    })();




    //
    // $.ajax({
    //     //url: 'https://api.spotify.com/v1/albums/6KSvWFf4g4PrIldtchJsTC',
    //     url: 'https://api.spotify.com/v1/me/albums',
    //     headers: { 'Authorization': 'Bearer ' + access_token },
    //     data: {
    //         limit: 50
    //     },
    //     json: true
    // }).done(function(data) {
    //     console.log("ALL ALBUMS", data);
    //     console.log("firstUser album id: ", data.items[0].album.id);
    //     console.log("LENGTH: ", data.items.length);
    //     var simCount = 0;
    //     var similarAlbums = [];
    //     for (var x = 0; x < data.items.length; x++) {
    //         console.log(data.items[x].album.name + " by " + data.items[x].album.artists[0].name);
    //         var result = window.localStorage.getItem(data.items[x].album.id);
    //         if (result != null) {
    //             console.log("SIMILAR ONE!!!!!!      ", JSON.parse(result));
    //             simCount += 1;
    //             similarAlbums.push(result);
    //         }
    //         // var album = {
    //         //     name: data.items[x].album.name,
    //         //     artist: data.items[x].album.artists[0].name,
    //         // }
    //         //window.localStorage.setItem(data.items[x].album.id, JSON.stringify(album));
    //     }
    //     // 7bgi7zCoDsZdlLKPonHZqP = chance
    //     var testing = JSON.parse(window.localStorage.getItem('1vz94WpXDVYIEGja8cjFNa'));
    //     console.log("IN YOUR TASTE: ", testing);
    //     var denom = Math.max(data.items.length, myNumAlbums);
    //     console.log("denom: ", denom);
    //     console.log("PRINTING SIMILAR!!! . . .. . . .. . .. . .", simCount);
    //     var percentage = simCount / denom * 100;
    //     console.log("percentage!!!!!!!!!!!!!!", percentage, "%");
    //     for (var x = 0; x < similarAlbums.length; x++) {
    //         console.log(JSON.parse(similarAlbums[x]));
    //     }
    //     window.localStorage.clear();
    // });

});

app.get('/secondMusic', function(req, res) {

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    console.log("2req: ", req.query.code);
    console.log("2state: ", req.query.state);
    console.log("2storedState: ", storedState);

    if (state === null || state !== storedState) {
        console.log("odelia");
        res.redirect('/#' + querystring.stringify({
            error: 'state_mismatch'
        }));
    } else {
        console.log("saraphina");
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: REDIRECT_URI_SECOND,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            console.log("response.statusCode: ", response.statusCode);
            console.log("error??? ", error);
            console.log("body.....", body);
            if (!error && response.statusCode === 200) {
                console.log("mom");

                var access_token = body.access_token,
                refresh_token = body.refresh_token;
                access_token_global = access_token;
                console.log("access token in second: ", access_token_global);

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                // res.redirect('/#' +
                // querystring.stringify({
                //     access_token: access_token,
                //     refresh_token: refresh_token
                // }));

                res.render('second');
            } else {
                console.log("dad");
                res.redirect('/#' +
                querystring.stringify({
                    error: 'invalid_token'
                }));
            }
        });
    }

});


app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    console.log("1req: ", req.query.code);
    console.log("1state: ", req.query.state);
    console.log("1storedState: ", storedState);

    if (state === null || state !== storedState) {
        res.redirect('/#' + querystring.stringify({
            error: 'state_mismatch'
        }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: REDIRECT_URI_FIRST,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                refresh_token = body.refresh_token;
                access_token_global = access_token;
                console.log("access token in first: ", access_token_global);

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                querystring.stringify({
                    access_token: access_token,
                    refresh_token: refresh_token
                }));
            } else {
                res.redirect('/#' +
                querystring.stringify({
                    error: 'invalid_token'
                }));
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            access_token_global = access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

console.log('Listening on port: ', PORT);
app.listen(PORT);

/*
first user signs in
get their album list
@ save album list in mongodb with key as spotify user id
hash albums into hashtable
second user signs in
get their album list
iterate through album list and check for match in hashtable, while adding up count of same
display percentage similar
@ display top 5 for each

TODO friday night:
- get all albums not just 20
- do redirection to different pages, with buttons in correct places
- display the results on the actual webpages

TODO next:
- monogodb
- put it on Heroku

TODO next next:
- frontend improvements

TODO next next next or never:
- other bonus features


TODO writing:
BACKEND
save first user query to mongo db and make sure retrieval works
get second user login to work
retrieve first user data from mongodb and load it into local hashtable
compare second user data with first user data
make percentage number
get all albums in library not just first 20

FRONTEND
some kind of onready function after first user data is saved in database
leads to login page for second user
leads to results page (results url or just display results on same page?)
make results page with percentage

BACKEND
keep a list of the albums that are similar between users

FRONTEND
display list of albums in common on results page

other improvements:
display each user's top albums
dipslay user's complete list of albums (/ with common ones highlighted)
display other info about their genres or whatever
persistently store the users' data in db and query it with spotify id before even making api call (not great for functionality but more as practice with db)

*/

/*
also make my own API as practice
*/
