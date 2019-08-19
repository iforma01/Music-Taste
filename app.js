/**
 * Isabella Forman
 * August 2019
 * Music Taste
 * app.js
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const requestProm = require('request-promise');
require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PORT = process.env.PORT || 8888;
// const REDIRECT_URI_FIRST = 'http://localhost:8888/callback';
// const REDIRECT_URI_SECOND = 'http://localhost:8888/secondMusic';
const REDIRECT_URI_FIRST = 'https://music-taste-compare.herokuapp.com/callback';
const REDIRECT_URI_SECOND = 'https://music-taste-compare.herokuapp.com/secondMusic';
const API_ENDPOINT = `https://api.spotify.com`;
const PAGE_SIZE = 50; // How many records the API returns in a page.

var access_token_global = ''; // TO DO don't keep it global and ahrd coded!!

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

const bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());


const getTopArtists = async () => {
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

const getAlbums = async () => {
    let allAlbums = [];
    let keepGoing = true;
    let offset = 0;
    while (keepGoing) {
        let response = await reqAlbums(offset);
        allAlbums.push(response);
        offset += 50;
        if (response.items.length < PAGE_SIZE) {
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
            allAlbums = await getAlbums();

            // For testing purposes
            // for (var i = 0; i < allAlbums.length; i++) {
            //     console.log("next album set");
            //     console.log("myNumAlbums: ", allAlbums[i].items.length);
            //     for (var j = 0; j < allAlbums[i].items.length; j++) {
            //         console.log(allAlbums[i].items[j].album.name + " by " + allAlbums[i].items[j].album.artists[0].name);
            //     }
            // }

            var albumsObject = loadRelevantDataToObject(allAlbums);
            var top5First = await getTopArtists();
            var top5FirstList = []
            for (var i = 0; i < top5First.items.length; i++) {
                top5FirstList.push(top5First.items[i].name);
            }

            res.render('top5First', {top5List: top5FirstList, albumsFirst: JSON.stringify(albumsObject)});
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

        if (firstAlbums[key]) {
            simCount += 1;
            similarAlbums.push(firstAlbums[key]);
        }
    }
    var firstSize = Object.keys(firstAlbums).length;
    var secondSize = Object.keys(secondAlbums).length;
    var denom = Math.max(Object.keys(firstAlbums).length, Object.keys(secondAlbums).length);
    var percentage = Math.round(simCount / denom * 100 * 100) / 100;

    // For testing purposes
    // for (var x = 0; x < similarAlbums.length; x++) {
    //     console.log(similarAlbums[x].name + " by " + similarAlbums[x].artist);
    // }

    return {percentSimilar: percentage, similarList: similarAlbums};
}

function loadRelevantDataToObject(allAlbums) {
    var albumsObject = {};
    var pages = allAlbums.length;
    for (var i = 0; i < pages; i++) {
        for (var j = 0; j < allAlbums[i].items.length; j++) {
            var value = {
                name: allAlbums[i].items[j].album.name,
                artist: allAlbums[i].items[j].album.artists[0].name,
            }
            albumsObject[allAlbums[i].items[j].album.id] = value;
        }
    }
    return albumsObject;
}

app.get('/top5Second', function(req, res) {
    (async () => {
        try {
            var top5Second = await getTopArtists();
            var top5SecondList = []
            for (var i = 0; i < top5Second.items.length; i++) {
                top5SecondList.push(top5Second.items[i].name);
            }

            res.render('top5Second', {top5List: top5SecondList});
        } catch (e) {
            console.log("Error in top5Second: ", e);
        }
    })();
});

app.post('/albumsSecond', function(req, res) {
    var albumsObject1 = req.body;
    (async () => {
        try {
            allAlbums2 = await getAlbums();
            var albumsObject2 = loadRelevantDataToObject(allAlbums2);
            var results = getSimilarAlbums(albumsObject1, albumsObject2);
            res.json({percentage: results.percentSimilar, similarList: results.similarList});
        }
        catch (e) {
            console.log("error in albumsSecond ", e);
        }
    })();
});

app.get('/secondMusic', function(req, res) {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

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
                redirect_uri: REDIRECT_URI_SECOND,
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

                // we can also pass the token to the browser to make requests from there
                // res.redirect('/#' +
                // querystring.stringify({
                //     access_token: access_token,
                //     refresh_token: refresh_token
                // }));

                res.render('second');
            } else {
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
    console.log("state: ", state);
    console.log("storedState: ", storedState);

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
