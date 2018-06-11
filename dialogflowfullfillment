/* eslint-disable linebreak-style,require-jsdoc,max-len */
'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
let PropertiesReader = require('properties-reader');
let properties = PropertiesReader('servicekeys.file');
let google_service_key = properties.get('google.service.key');

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
    agent.add('Intent ' + initialIntent + '; country ' + agent.parameters.birthCountry + '; city ' + agent.parameters.birthCity + '; birthday ' + birthDay + ' year ' + birthYear + ' time ' + birthTime + ' place ' + birthPlace + ' asked for ' + askedFor);
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
        const birthDay = context.parameters.birthDay;
        const birthYear = context.parameters.birthYear;
        const birthTime = context.parameters.birthTime;
        const birthPlace = context.parameters.birthPlace;
        const initialIntent = context.parameters.initialIntent;
        return tryToSpeakChartWithParameters(birthDay, birthYear, birthTime, birthPlace, initialIntent);
    }

    function tryToSpeakChartWithParameters(birthDay, birthYear, birthTime, birthPlace, initialIntent) {
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
            addSpokenContext(agent);
            agent.add(getChart(birthDay, birthYear, birthTime, birthPlace));
            agent.setContext({name: 'conversation', lifespan: 0});
        } else if ('PlanetSign' === initialIntent) {
            addSpokenContext(agent);
            agent.add(getChart(birthDay, birthYear, birthTime, birthPlace));// todo ask for more
            agent.setContext({name: 'conversation', lifespan: 0});
            // if (agent.parameters.planet === 'Sun') {
            // } else if (agent.parameters.planet) {
            //     agent.add(getChart(birthDay, birthYear, birthTime, birthPlace));
            // if (!birthTime) {
            //     askForBirthTime(agent);
            // } else if (!birthPlace) {
            //     askForBirthPlace(agent);
            // }
            // }
        } else {
            // error
        }
        agent.add(new Suggestion('Sun Sign'));
        agent.add(new Suggestion('Moon Sign'));
        agent.add(new Suggestion('Full Chart'));
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
        return tryToSpeakChartWithParameters(birthDay, birthYear, birthTime, birthPlace, initialIntent);
    }

    function getChart(birthDay, birthYear, birthTime, birthPlace) {// todo go to aws lambda
        return 'Here is the natal chart of the person is blah.';
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
                return Promise.all([resolveTimezone(latitude, longitude)]).then(function (gmtOffset) {
                    addSpokenContext(agent);
                    agent.add('Is it ' + fullname + '?');
                    agent.add(new Suggestion('Yes'));
                    agent.add(new Suggestion('No'));
                    agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthLat: latitude}});
                    agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthLng: longitude}});
                    agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthFullName: fullname}});
                    agent.setContext({name: 'conversation', lifespan: 5, parameters: {birthTimeZoneOffset: gmtOffset}});
                    return Promise.resolve();
                });
            }).catch(function (error) {
                console.log('ERROR: ' + error);
                return Promise.reject(error);
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
            return Promise.reject(error);
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
