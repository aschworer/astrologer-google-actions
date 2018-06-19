/* eslint-disable linebreak-style,require-jsdoc,max-len */
'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements


let AWS = require("aws-sdk");
let lambda = new AWS.Lambda({region: 'us-east-1', apiVersion: '2015-03-31'});

function askForBirthDay(agent) {
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'date'}});
    agent.add('What is the date of birth? For example, 1st of January, 1990.');
    agent.add(new Suggestion('1st of January, 1990'));
}

function askForBirthYear(agent) {
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'year'}});
    agent.add('What is the year of birth? For example, 1990.');
    agent.add(new Suggestion('1990'));
}

function askForBirthTime(agent) {
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'time'}});
    agent.add('Do you know the time of birth? For example, 9 PM. If you are unsure, you can say I don\'t know.');
    agent.add(new Suggestion('7 20 PM'));
    agent.add(new Suggestion('I don\'t know'));
}

function askForBirthPlace(agent) {
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'place'}});
    agent.add('Do you know the city, or country of birth? For example, Paris. If you are unsure, you can say I don\'t know.');
    agent.add(new Suggestion('Paris'));
    agent.add(new Suggestion('Australia'));
    agent.add(new Suggestion('I don\'t know'));
}

function confirmBirthDay(agent, birthDay) {
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {askedFor: 'toConfirmBirthDate'}});
    agent.add('Is it ' + birthDay + '?');
    agent.add(new Suggestion('Yes'));
    agent.add(new Suggestion('No'));
}

function askToConfirmOrForYear(agent) {
    let contextParameters = agent.getContext('conversation').parameters;
    const initialIntent = contextParameters.initialIntent;
    let birthDay = (agent.parameters.birthDay) ? agent.parameters.birthDay : contextParameters.birthDay;
    const birthYear = (agent.parameters.birthYear) ? agent.parameters.birthYear : contextParameters.birthYear;
    console.log('askToConfirmOrForYear(): birth day - ' + birthDay + '; birth year - ' + birthYear);
    if (!birthYear) {
        if (withinAYearFromNow(birthDay)) {
            if ('PlanetSign' === initialIntent && contextParameters.planet === 'Sun') {//2019-01-01, Sun sign
                return confirmBirthDay(agent, new Date(birthDay).toLocaleString('en-US', {month: "long", day: "numeric"}));
            } else {//2019-01-01, Full chart
                return askForBirthYear(agent);
            }
        } else {//1985-01-01
            return confirmBirthDay(agent, birthDay);
        }
    } else {//2019-01-01, 1983
        if (birthYear < 1550 || birthYear > 2649) {
            agent.add("Sorry, I can only check for year of birth between 1550 and 2649. Let's try again. Tell me the year of birth.");
            agent.add(new Suggestion('1990'));
        } else {
            let newBirthDay = birthYear + birthDay.substring(4, birthDay.length);
            agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthDay: newBirthDay}});
            return confirmBirthDay(agent, newBirthDay);
        }
    }
}

function withinAYearFromNow(dateStr) {
    let date = Date.parse(dateStr);
    let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDay());
    let dateInAYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDay());
    return date === today || (date < dateInAYear && date > today);
}

function confirmBirthPlace(agent) {
    let birth_place = (agent.parameters.birthCity) ? agent.parameters.birthCity : agent.parameters.birthCountry;
    console.log("confirmBirthPlace(): birth_place - " + birth_place);
    agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthPlace: birth_place}});
    return googleMapsClient.geocode({address: birth_place}).asPromise()
        .then((response) => {
            let latitude;
            let longitude;
            let fullname;
            let is_country;
            response.json.results.forEach((place) => {
                place.address_components[0].types.forEach((actype) => {
                    if ('country' === actype || 'locality' === actype) {
                        if ('country' === actype) is_country = true;
                        latitude = place.geometry.location.lat;
                        longitude = place.geometry.location.lng;
                        fullname = getFullName(place);
                    }
                });
            });
            return resolveTimezone(latitude, longitude).then(function (gmtOffset) {
                agent.add('Is it ' + ((is_country) ? 'country ' : '') + fullname + '?');
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

function getFullName(place) {
    let city;
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

function getChart(birthDay, birthTime, birthLat, birthLng, timezone) {
    let pullResults;
    let pullParams = {
        FunctionName: 'flatlib',
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Payload: JSON.stringify({'date': birthDay.replace(/-/g , "/"), 'lng': birthLng, 'lat': birthLat, 'time': birthTime, 'timezone': timezone})
    };
    console.log("--------- getChart(): flatlib request - " + pullParams.Payload);
    return new Promise(
        (resolve, reject) => {
            //         return resolve(JSON.parse("[  {    \"characteristic\": \"Sun\",    \"sign\": \"Gemini\",    \"angle\": \"10.53000876876159\"  },  {    \"characteristic\": \"Moon\",    \"sign\": \"Aries\",    \"angle\": \"1.5793052788431055\"  },  {    \"characteristic\": \"Mercury\",    \"sign\": \"Gemini\",    \"angle\": \"21.57676311160961\"  },  {    \"characteristic\": \"Venus\",    \"sign\": \"Cancer\",    \"angle\": \"12.863687119768556\"  },  {    \"characteristic\": \"Mars\",    \"sign\": \"Capricorn\",    \"angle\": \"22.751005857916653\"  },  {    \"characteristic\": \"Jupiter\",    \"sign\": \"Pisces\",    \"angle\": \"20.21867988206344\"  },  {    \"characteristic\": \"Saturn\",    \"sign\": \"Sagittarius\",    \"angle\": \"6.0934773435272405\"  },  {    \"characteristic\": \"Uranus\",    \"sign\": \"Sagittarius\",    \"angle\": \"20.798915632512887\"  },  {    \"characteristic\": \"Neptune\",    \"sign\": \"Capricorn\",    \"angle\": \"5.080841892187436\"  },  {    \"characteristic\": \"Pluto\",    \"sign\": \"Scorpio\",    \"angle\": \"5.043025700925483\"  },  {    \"characteristic\": \"Chiron\",    \"sign\": \"Gemini\",    \"angle\": \"14.759417769021368\"  },  {    \"characteristic\": \"Lilith\",    \"sign\": \"Pisces\",    \"angle\": \"12.152008390294213\"  },  {    \"characteristic\": \"House1\",    \"sign\": \"Leo\",    \"angle\": \"28.52049792057312\"  },  {    \"characteristic\": \"House2\",    \"sign\": \"Virgo\",    \"angle\": \"28.9464302344997\"  },  {    \"characteristic\": \"House3\",    \"sign\": \"Libra\",    \"angle\": \"29.45809962602985\"  },  {    \"characteristic\": \"House4\",    \"sign\": \"Scorpio\",    \"angle\": \"28.009748474196414\"  },  {    \"characteristic\": \"House5\",    \"sign\": \"Sagittarius\",    \"angle\": \"27.60751484818627\"  },  {    \"characteristic\": \"House6\",    \"sign\": \"Capricorn\",    \"angle\": \"26.98758329148177\"  },  {    \"characteristic\": \"House7\",    \"sign\": \"Aquarius\",    \"angle\": \"28.52049792057312\"  },  {    \"characteristic\": \"House8\",    \"sign\": \"Pisces\",    \"angle\": \"28.9464302344997\"  },  {    \"characteristic\": \"House9\",    \"sign\": \"Aries\",    \"angle\": \"29.45809962602982\"  },  {    \"characteristic\": \"House10\",    \"sign\": \"Taurus\",    \"angle\": \"28.009748474196407\"  },  {    \"characteristic\": \"House11\",    \"sign\": \"Gemini\",    \"angle\": \"27.607514848186284\"  },  {    \"characteristic\": \"House12\",    \"sign\": \"Cancer\",    \"angle\": \"26.987583291481798\"  }]"));
            //     }
            lambda.invoke(pullParams,
                function (error, data) {
                    if (error) {
                        return reject(error);
                    }
                    pullResults = JSON.parse(data.Payload);
                    console.log('chart from lambda:');
                    console.log(pullResults);
                    return resolve(pullResults);
                }
            )
        }
    );
}

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({request, response});
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    let body = request.body;
    console.log('Dialogflow Request body: ' + JSON.stringify(body));
    console.log('LOCALE: ' + body.originalRequest.data.user.locale);

    function tryToSpeakChart() {
        return tryToSpeakChartWithParams(false, false);
    }

    function tryToSpeakChartWithParams(birthTimeUnknown, birthPlaceUnknown) {
        let context_params = agent.getContext('conversation').parameters;
        const birthDay = context_params.birthDay;
        const birthTime = (birthTimeUnknown) ? 'unknown' : context_params.birthTime;
        const birthPlace = (birthPlaceUnknown) ? 'unknown' : context_params.birthPlace;
        const birthPlaceFullName = context_params.birthPlaceFullName;
        console.log('tryToSpeakChart() - day: ' + birthDay + ', time: ' + birthTime + ', place: ' + birthPlace + ', placeFullName: ' + birthPlaceFullName);
        if (!birthDay) return askForBirthDay(agent);
        if ('FullChart' === context_params.initialIntent) {
            if (!birthTime) return askForBirthTime(agent);
            if (!birthPlace) return askForBirthPlace(agent);
            return getChart(birthDay, birthTime, context_params.birthLat, context_params.birthLng, context_params.birthTimeZoneOffset).then(function (result) {
                let speech = 'Here is the natal chart of the person born on ' +
                    (withinAYearFromNow(birthDay) ? new Date(birthDay).toLocaleString('en-US', {month: "long", day: "numeric"}) : birthDay);
                if (birthTime && birthTime !== 'unknown') speech += ' at ' +
                    new Date(birthDay + ' ' + birthTime).toLocaleString('en-US', {hour: 'numeric', hour12: true, minute: 'numeric'});
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
                if (missing !== '') speech += 'Planets that are not mentioned require time or place of birth. Those include ' + missing + 'Ascendant, Midheaven and the other houses.';
                agent.add(speech);
                agent.add(new Suggestion('Sun Sign'));
                agent.add(new Suggestion('Moon Sign'));
                agent.add(new Suggestion('Full Chart'));
                agent.setContext({name: 'conversation', lifespan: 0});//reset context
            }).catch(function (error) {
                console.log('ERROR: ' + error);
            });
        } else if ('PlanetSign' === context_params.initialIntent) {
            return getChart(birthDay, (birthTime === 'unknown') ? null : birthTime, context_params.birthLat, context_params.birthLng, context_params.birthTimeZoneOffset).then(function (result) {
                let speech;
                const requested_planet = context_params.planet;
                result.forEach((characteristicInSign) => {
                    if (requested_planet.toUpperCase() === characteristicInSign.characteristic.toUpperCase()) {
                        if (characteristicInSign.sign.includes('-')) {
                            if (!birthTime) return askForBirthTime(agent);
                            if (!birthPlace) return askForBirthPlace(agent);
                            let whats_missing = '';
                            if (birthTime === 'unknown') whats_missing = 'time ';
                            if (birthPlace === 'unknown') {
                                if (whats_missing !== '') whats_missing += " and ";
                                whats_missing += 'place';
                            }
                            speech = 'Apologies, I checked again for you, but I really need to know ' + whats_missing + ' of birth. Try to get this information and come back to me.';
                        } else {
                            speech = 'The ' + requested_planet.charAt(0).toUpperCase() + requested_planet.slice(1) + ' sign of a person born on ' +
                                (withinAYearFromNow(birthDay) ? new Date(birthDay).toLocaleString('en-US', {
                                    month: "long",
                                    day: "numeric"
                                }) : birthDay);
                            if (birthTime && birthTime !== 'unknown') speech += ' at ' +
                                new Date(birthDay + ' ' + birthTime).toLocaleString('en-US', {hour: 'numeric', hour12: true, minute: 'numeric'});
                            if (birthPlaceFullName) speech += ' in ' + birthPlaceFullName;
                            speech += ' is ' + characteristicInSign.sign;
                        }
                    }
                });
                agent.add(speech);
                agent.add(new Suggestion('Sun Sign'));
                agent.add(new Suggestion('Moon Sign'));
                agent.add(new Suggestion('Full Chart'));
                agent.setContext({name: 'conversation', lifespan: 0});
            }).catch(function (error) {
                console.log('ERROR: ' + error);
            });
        }
    }

    function handleIDontKnowResponse(agent) {
        let context_parameters = agent.getContext('conversation').parameters;
        let askedFor = context_parameters.askedFor;
        console.log('handleIDontKnowResponse() - asked for: ' + askedFor);
        if ('date' === askedFor) {
            return askForBirthDay(agent);
        } else if ('year' === askedFor) {
            if ('PlanetSign' === context_parameters.initialIntent && agent.parameters.planet === 'Sun') {//Sun sign
                return confirmBirthDay(agent);
            }
            return askForBirthYear(agent);
        } else if ('place' === askedFor) {
            agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthPlace: 'unknown'},});
            return tryToSpeakChartWithParams(false, true);
        } else if ('time' === askedFor) {
            agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthTime: 'unknown'},});
            return tryToSpeakChartWithParams(true, false);
        }
        return tryToSpeakChartWithParams(false, false);
    }

    let intentMap = new Map();
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
