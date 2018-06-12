/* eslint-disable linebreak-style,require-jsdoc,max-len */
'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
// let PropertiesReader = require('properties-reader');
// let properties = PropertiesReader('servicekeys.file');
// let google_service_key = properties.get('google.service.key');


// let flatlibKeyId = properties.get('flatlib.lambda.keyId');
// let flatlibSecretKey = properties.get('flatlib.lambda.key');

let AWS = require("aws-sdk");
let lambda = new AWS.Lambda({region: 'us-east-1', apiVersion: '2015-03-31'});


function askForBirthDay(agent) {
    addSpokenContext(agent);
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'date'}});
    agent.add('What is the date of birth? For example, 1st of January, 1990.');
    agent.add(new Suggestion('1990'));
    agent.add(new Suggestion('1st of January, 1990'));
    agent.add(new Suggestion('I don\'t know'));
}

function askForBirthYear(agent) {
    addSpokenContext(agent);
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'year'}});
    agent.add('What is the year of birth? For example, 1990.');
    agent.add(new Suggestion('1990'));
    agent.add(new Suggestion('5000'));
    agent.add(new Suggestion('I don\'t know'));
}

function askForBirthTime(agent) {
    addSpokenContext(agent);
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'time'}});
    agent.add('Do you know the time of birth? For example, 9 PM. If you are unsure, you can say I don\'t know.');
    agent.add(new Suggestion('11:20'));
    agent.add(new Suggestion('I don\'t know'));
}

function askForBirthPlace(agent) {
    addSpokenContext(agent);
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'place'}});
    agent.add('Do you know the city, or country of birth? For example, Paris. If you are unsure, you can say I don\'t know.');
    agent.add(new Suggestion('Paris'));
    agent.add(new Suggestion('I don\'t know'));
}

function confirmBirthDay(agent, birthDay) {
    addSpokenContext(agent);
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'toConfirmBirthDate'}});
    agent.add('Did you say ' + birthDay + '?');
    agent.add(new Suggestion('yes'));
    agent.add(new Suggestion('no'));
}

function addSpokenContext(agent) {
    let context = agent.getContext('conversation');
    const birthDay = context.parameters.birthDay;
    const birthYear = context.parameters.birthYear;
    const birthTime = context.parameters.birthTime;
    const birthPlace = context.parameters.birthPlace;
    const initialIntent = context.parameters.initialIntent;
    const askedFor = context.parameters.askedFor;
    // agent.add('Intent ' + initialIntent + '; country ' + agent.parameters.birthCountry + '; city ' + agent.parameters.birthCity + '; birthday ' + birthDay + ' year ' + birthYear + ' time ' + birthTime + ' place ' + birthPlace + ' asked for ' + askedFor);
}

function askToConfirmOrForYear(agent) {
    let parameters = agent.getContext('conversation').parameters;
    const initialIntent = parameters.initialIntent;
    let birthDay = (agent.parameters.birthDay) ? agent.parameters.birthDay : parameters.birthDay;
    const birthYear = agent.parameters.birthYear;
    if (birthYear) birthDay = birthYear + birthDay.substring(4, birthDay.length);
    // only if year is current
    if ('PlanetSign' === initialIntent && agent.parameters.planet === 'Sun') {
        return confirmBirthDay(agent, birthDay.substring(4, birthDay.length));
    } else if (withinAYearFromNow(birthDay) && birthYear) {
        return askForBirthYear(agent);
    }
    return confirmBirthDay(agent, birthDay);
}

function withinAYearFromNow(dateStr) {
    let date = Date.parse(dateStr);
    let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDay());
    let dateInAYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDay());
    return date === today || (date < dateInAYear && date > today);
}

function getFullName(place) {
    let city = null;
    let country = '';
    place.address_components.forEach((address_component) => {
        address_component.types.forEach((address_component_type) => {
            if ('locality' === address_component_type) {
                city = address_component.short_name;
            }
            if ('country' === address_component_type) {
                country = address_component.long_name;
            }
        });
    });
    return (city) ? city + ", in " + country : country;
}


exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({request, response});
    let googleMapsClient = require('@google/maps').createClient({key: google_service_key, Promise: Promise});

    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    function tryToSpeakChart(agent) {
        let context = agent.getContext('conversation');
        const initialIntent = context.parameters.initialIntent;
        const birthDay = context.parameters.birthDay;
        const birthPlace = context.parameters.birthPlace;
        const birthYear = context.parameters.birthYear;
        const birthTime = context.parameters.birthTime;
        const birthLat = context.parameters.birthLat;
        const birthLng = context.parameters.birthLng;
        const birthPlaceFullName = context.parameters.birthPlaceFullName;
        const birthTimeZoneOffset = context.parameters.birthTimeZoneOffset;

        if (!birthDay) {
            return askForBirthDay(agent);
        }

        if ('FullChart' === initialIntent) {
            // if (!birthYear) {
            //     return askForBirthYear(agent);
            // }
            if (!birthTime) {
                return askForBirthTime(agent);
            }
            if (!birthPlace) {
                return askForBirthPlace(agent);
            }
            return getChart(birthDay, birthTime, birthLat, birthLng, birthTimeZoneOffset).then(function (result) {
                let speech = 'Here is the natal chart of the person born on ' + birthDate;
                if (birthTime) speech += ' at ' + birthTime;
                if (birthPlaceFullName) speech += ' in ' + birthPlaceFullName;
                speech += ': \n';
                let missing = '';
                result.forEach((characteristicInSign) => {
                    if (characteristicInSign.sign.includes('-')) {
                        missing += characteristicInSign.characteristic + ', ';
                    } else {
                        speech += characteristicInSign.characteristic + ' is in ' + characteristicInSign.sign + '.\n';
                    }

                });
                if (missing !== '') {
                    speech += 'Planets that are not mentioned require time or place of birth. Those include ' + missing + 'Ascendant, Midheaven and the other houses.'
                }
                addSpokenContext(agent);
                agent.add(speech);
                agent.add(new Suggestion('Sun Sign'));
                agent.add(new Suggestion('Moon Sign'));
                agent.add(new Suggestion('Full Chart'));
                agent.setContext({name: 'conversation', lifespan: 0});
            }).catch(function (error) {
                console.log('ERROR: ' + error);
            });
        } else if ('PlanetSign' === initialIntent) {
            return getChart(birthDay, birthTime, birthLat, birthLng, birthTimeZoneOffset).then(function (result) {
                let speech;
                result.forEach((characteristicInSign) => {
                    if (planet === characteristicInSign.characteristic) {
                        if (characteristicInSign.sign.includes('-')) {
                            if (!birthTime) return askForBirthTime(agent);
                            if (!birthPlaceFullName) return askForBirthPlace(agent);
                            let whats_missing = '';
                            if (birthTime === 'unknown') whats_missing = 'time ';
                            if (birthPlaceFullName === 'unknown') {
                                if (whats_missing !== '') whats_missing += " and ";
                                whats_missing += 'place';
                            }
                            whats_missing += ' of birth';
                            speech = 'Apologies, I checked again for you, but I really need to know ' + whats_missing + '. Try to get this information and come back to me.'
                        } else {
                            speech = 'The ' + planet + ' sign of a person born on ' + birthDate;
                            if (birthTime) speech += ' at ' + birthTime;
                            if (birthPlaceFullName) speech += ' in ' + birthPlaceFullName;
                            speech += ' is ';
                            speech += characteristicInSign.sign;
                        }
                    }
                });
                addSpokenContext(agent);
                agent.add(speech);
                agent.setContext({name: 'conversation', lifespan: 0});
                agent.add(new Suggestion('Sun Sign'));
                agent.add(new Suggestion('Moon Sign'));
                agent.add(new Suggestion('Full Chart'));
            }).catch(function (error) {
                console.log('ERROR: ' + error);
            });
        }
    }

    function getChart(birthDate, birthTime, birthLat, birthLng, timezone) {
        let pullResults;
        let pullParams = {
            FunctionName: 'flatlib',
            InvocationType: 'RequestResponse',
            LogType: 'None',
            Payload: JSON.stringify({'date': birthDate, 'lng': birthLng, 'lat': birthLat, 'time': birthTime, 'timezone': timezone})
        };
        return new Promise((resolve, reject) => {
                return resolve(JSON.parse("[  {    \"characteristic\": \"Sun\",    \"sign\": \"Gemini\",    \"angle\": \"10.53000876876159\"  },  {    \"characteristic\": \"Moon\",    \"sign\": \"Aries\",    \"angle\": \"1.5793052788431055\"  },  {    \"characteristic\": \"Mercury\",    \"sign\": \"Gemini\",    \"angle\": \"21.57676311160961\"  },  {    \"characteristic\": \"Venus\",    \"sign\": \"Cancer\",    \"angle\": \"12.863687119768556\"  },  {    \"characteristic\": \"Mars\",    \"sign\": \"Capricorn\",    \"angle\": \"22.751005857916653\"  },  {    \"characteristic\": \"Jupiter\",    \"sign\": \"Pisces\",    \"angle\": \"20.21867988206344\"  },  {    \"characteristic\": \"Saturn\",    \"sign\": \"Sagittarius\",    \"angle\": \"6.0934773435272405\"  },  {    \"characteristic\": \"Uranus\",    \"sign\": \"Sagittarius\",    \"angle\": \"20.798915632512887\"  },  {    \"characteristic\": \"Neptune\",    \"sign\": \"Capricorn\",    \"angle\": \"5.080841892187436\"  },  {    \"characteristic\": \"Pluto\",    \"sign\": \"Scorpio\",    \"angle\": \"5.043025700925483\"  },  {    \"characteristic\": \"Chiron\",    \"sign\": \"Gemini\",    \"angle\": \"14.759417769021368\"  },  {    \"characteristic\": \"Lilith\",    \"sign\": \"Pisces\",    \"angle\": \"12.152008390294213\"  },  {    \"characteristic\": \"House1\",    \"sign\": \"Leo\",    \"angle\": \"28.52049792057312\"  },  {    \"characteristic\": \"House2\",    \"sign\": \"Virgo\",    \"angle\": \"28.9464302344997\"  },  {    \"characteristic\": \"House3\",    \"sign\": \"Libra\",    \"angle\": \"29.45809962602985\"  },  {    \"characteristic\": \"House4\",    \"sign\": \"Scorpio\",    \"angle\": \"28.009748474196414\"  },  {    \"characteristic\": \"House5\",    \"sign\": \"Sagittarius\",    \"angle\": \"27.60751484818627\"  },  {    \"characteristic\": \"House6\",    \"sign\": \"Capricorn\",    \"angle\": \"26.98758329148177\"  },  {    \"characteristic\": \"House7\",    \"sign\": \"Aquarius\",    \"angle\": \"28.52049792057312\"  },  {    \"characteristic\": \"House8\",    \"sign\": \"Pisces\",    \"angle\": \"28.9464302344997\"  },  {    \"characteristic\": \"House9\",    \"sign\": \"Aries\",    \"angle\": \"29.45809962602982\"  },  {    \"characteristic\": \"House10\",    \"sign\": \"Taurus\",    \"angle\": \"28.009748474196407\"  },  {    \"characteristic\": \"House11\",    \"sign\": \"Gemini\",    \"angle\": \"27.607514848186284\"  },  {    \"characteristic\": \"House12\",    \"sign\": \"Cancer\",    \"angle\": \"26.987583291481798\"  }]"))
            }
            // lambda.invoke(pullParams,
            //     function (error, data) {
            //         if (error) {
            //             return reject(error);
            //         }
            //         pullResults = JSON.parse(data.Payload);
            //         console.log('lambda responded');
            //         console.log(pullResults);
            // return resolve(pullResults);
            // }
            // )
            // }
        );
    }

    function handleIDontKnowResponse(agent) {
        let context = agent.getContext('conversation');
        let birthDay = context.parameters.birthDay;
        let birthYear = context.parameters.birthYear;
        let birthTime = context.parameters.birthTime;
        let birthPlace = context.parameters.birthPlace;
        let askedFor = context.parameters.askedFor;
        const initialIntent = context.parameters.initialIntent;

        if ('place' === askedFor) {
            birthPlace = 'unknown';
        }
        if ('time' === askedFor) {
            birthTime = 'unknown';
        }
        if ('date' === askedFor) {
            birthDay = 'unknown';
        }
        if ('year' === askedFor) {
            birthYear = 'unknown';
        }
        agent.setContext({
            name: 'conversation',
            lifespan: 5,
            parameters: {birthPlace: birthPlace, birthTime: birthTime, birthDay: birthDay, birthYear: birthYear},
        });
        return tryToSpeakChart(agent);
    }

    function confirmBirthPlace(agent) {
        let birthPlace = (agent.parameters.birthCity) ? agent.parameters.birthCity : agent.parameters.birthCountry;
        agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthPlace: birthPlace}});
        return googleMapsClient.geocode({address: birthPlace}).asPromise()
            .then((response) => {
                let latitude;
                let longitude;
                let fullname;
                response.json.results.forEach((place) => {
                    place.address_components[0].types.forEach((actype) => {
                        if ('country' === actype || 'locality' === actype) {
                            latitude = place.geometry.location.lat;
                            longitude = place.geometry.location.lng;
                            fullname = getFullName(place);
                        }
                    });
                });
                return resolveTimezone(latitude, longitude).then(function (gmtOffset) {
                    addSpokenContext(agent);
                    agent.add('Is it ' + fullname + '?');
                    agent.add(new Suggestion('Yes'));
                    agent.add(new Suggestion('No'));
                    agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthLat: latitude}});
                    agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthLng: longitude}});
                    agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthPlaceFullName: fullname}});
                    agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthTimeZoneOffset: gmtOffset}});
                });
            }).catch(function (error) {
                console.log('ERROR: ' + error);
                // return Promise.reject(error);
            });
    }

    function resolveTimezone(latitude, longitude) {
        return googleMapsClient.timezone({location: [latitude, longitude], timestamp: 1331766000, language: 'en'}).asPromise().then((response) => {
            let hours = Math.floor(response.json.rawOffset / 3600);
            let minutes = parseInt((response.json.rawOffset / 60) % 60);
            hours = (hours < 10) ? "0" + hours : hours;
            minutes = (minutes < 10) ? "0" + minutes : minutes;
            let gmtOffset = hours + ":" + minutes;
            if (!gmtOffset.startsWith("-")) {
                gmtOffset = "+" + gmtOffset;
            }
            return Promise.resolve(gmtOffset);
        }).catch(function (error) {
            console.log('ERROR: ' + error);
            // return Promise.reject(error);
        });
    }

    let intentMap = new Map();
    // intentMap.set('Default Welcome Intent', welcome);
    // intentMap.set('Default Fallback Intent', fallback);
    // intentMap.set('Planet Sign Intent', planetSign);
    // intentMap.set('Full Chart Intent', fullChart);
    intentMap.set('Birth Day Intent', askToConfirmOrForYear);
    intentMap.set('Birth Day Intent - Confirm Date', tryToSpeakChart);
    intentMap.set('Birth Year Intent', askToConfirmOrForYear);
    intentMap.set('Birth Year Intent - Confirm Date', tryToSpeakChart);
    intentMap.set('Birth Time Intent', tryToSpeakChart);
    intentMap.set('Birth Place Intent', confirmBirthPlace);
    intentMap.set('Birth Place Intent - Confirm Place', tryToSpeakChart);
    intentMap.set('I Dont Know Intent', handleIDontKnowResponse);
    agent.handleRequest(intentMap);
});
