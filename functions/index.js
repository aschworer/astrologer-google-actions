/* eslint-disable linebreak-style,require-jsdoc,max-len */
'use strict';

const {SimpleResponse, Suggestions} = require("actions-on-google");

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const i18n = require('i18n');
// const moment = require('moment');
i18n.configure({
    locales: ['en-US', 'fr-FR', 'fr-CA', 'ru-RU'],
    directory: __dirname + '/locales',
    defaultLocale: 'en-US'
});

let utils = require('./utils');
let location_service = require('./googleservices');
let charts_service = require('./natalchartservices');
console.log('--------------------------------deployed-----------------------------------------');

// console.log(i18n.__('IS_IT_DATE', new Date('1990-01-01').toLocaleString('ru', {month: "long", day: "numeric", year: "numeric"})));
// console.log(i18n.__("OBJECT_IN_SIGN", i18n.__('Lilith'), i18n.__('Scorpio')));
exports.natal_charts_fulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({request, response});
    utils.debug('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    let body = request.body;
    let locale = body.originalRequest.data.user.locale;

    i18n.setLocale(locale);
    const i_dont_know_sugg = new Suggestion(i18n.__('I_DONT_KNOW'));
    const year_sugg = new Suggestion(i18n.__("YEAR_EXAMPLE"));
    const full_date_sugg = new Suggestion(i18n.__("FULL_DATE_EXAMPLE"));
    const time_sugg = new Suggestion(i18n.__("TIME_EXAMPLE"));
    const city_sugg = new Suggestion(i18n.__("CITY_EXAMPLE"));
    const country_sugg = new Suggestion(i18n.__("COUNTRY_EXAMPLE"));
    // const yes_sugg = new Suggestion(i18n.__("YES"));
    const yes_sugg_conv = new Suggestions(i18n.__("YES"));
    // const no_sugg = new Suggestion(i18n.__("NO"));
    const no_sugg_conv = new Suggestions(i18n.__("NO"));

    utils.debug('Dialogflow Request body: ' + 'LOCALE: ' + locale.toUpperCase() + JSON.stringify(body));

    body.result.contexts.forEach((context) => {
        if (context.name === "conversation") {
            utils.debug('Conversation context: ' + JSON.stringify(context));
        }
    });

    function askForBirthDay(agent, context) {
        if (!context) context = {};
        context.askedFor = 'date';
        agent.context.set('conversation', 5, context);
        let return_speech = i18n.__('WHATS_THE_DATE_OF_BIRTH');
        console.log(return_speech, ' (askForBirthDay)');
        agent.add(return_speech);
        agent.add(full_date_sugg);
    }

    function askForBirthYear(agent) {
        agent.context.set('conversation', 5, {'askedFor': 'year'});
        let return_speech = i18n.__('WHATS_THE_YEAR_OF_BIRTH');
        console.log(return_speech, ' (askForBirthYear) ');
        agent.add(return_speech);
        agent.add(year_sugg);
    }

    function askForBirthTime(agent, context) {
        // agent.context.get('conversation').parameters['askedFor'] = 'time';
        // let paramsContext = agent.context.get('conversation').parameters;
        // paramsContext["askedFor"] = "time";
        // console.log(paramsContext);
        if (!context) context = {};
        context.askedFor = 'time';
        agent.context.set('conversation', 5, context);
        let return_speech = i18n.__('WHATS_THE_TIME_OF_BIRTH');
        console.log(return_speech, ' (askForBirthTime)');
        agent.add(return_speech);
        agent.add(time_sugg);
        agent.add(i_dont_know_sugg);
    }

    function askForBirthPlace(agent, context) {
        // let paramsContext = agent.context.get('conversation').parameters;
        // paramsContext["askedFor"] = "place";
        // let newParams;
        // for (var key in paramsContext) {
        // check if the property/key is defined in the object itself, not in parent
        // if (paramsContext.hasOwnProperty(key)) {
        //     console.log(key, paramsContext[key]);
        //     if (typeof key === 'string' || key instanceof String){
        //         console.log("string");
        //     }
        // }
        // }
        // console.log(paramsContext);
        // agent.context.set('conversation', 5, paramsContext);
        // console.log(agent.context.get('conversation').parameters);
        /*let params = {'birthDay': '1990-01-01',
            'initialIntent': 'FullChart',
            'askedFor': 'place',
            'birthDay.original': '1st of January, 1990',
            'birthTime': 'unknown'};*/
        // let params = {'askedFor': 'place', 'birthTime': 'unknown'};
        if (!context) context = {};
        context.askedFor = 'place';
        // agent.context.set('conversation', 5, {'askedFor': 'place'}); //- worked
        agent.context.set('conversation', 5, context); //- worked
        // let params = agent.context.get('conversation').parameters;
        let return_speech = i18n.__('WHATS_THE_PLACE_OF_BIRTH');
        console.log(return_speech, ' (askForBirthPlace)');
        agent.add(return_speech);
        agent.add(city_sugg);
        agent.add(country_sugg);
        agent.add(i_dont_know_sugg);

        // agent.context.set({
        //     'name':'conversation',
        //     'lifespan': 5,
        //     'parameters':params
        // });

        // agent.context.get('conversation').parameters

        // agent.context.get('conversation').parameters["askedFor"] = "place";
    }

    function confirmBirthDay(agent, birthDay, noYear) {
        agent.context.set('conversation', 5, {'askedFor': 'toConfirmBirthDate'});
        let return_speech = (noYear) ? i18n.__('IS_IT_DATE_NO_YEAR', birthDay) : i18n.__('IS_IT_DATE', birthDay);
        console.log(return_speech, ' (confirmBirthDay)');
        let conv = agent.conv();
        conv.ask(new SimpleResponse({speech: return_speech, text: i18n.__('IS_IT', birthDay),}));
        conv.ask(yes_sugg_conv);
        conv.ask(no_sugg_conv);
        agent.add(conv);
    }

    function confirmBirthPlace(agent) {
        // console.log('dob: ' + context_params.birthDay + "; tob: " + context_params.birthTime);
        let birth_place = (agent.parameters.birthCity) ? agent.parameters.birthCity : agent.parameters.birthCountry;
        if (birth_place === "" || birth_place === " ") {
            console.log("country or city " + birth_place + " was not recognised by Dialogflow");
            if ('time' === agent.context.get('conversation').parameters['askedFor']) {
                console.log("actually asked for time, not place...");
                agent.context.set('conversation', 5, {'birthPlace': ''});
                return askForBirthTime(agent);
            } else {
                birth_place = agent.parameters.birthPlace;
            }
        }
        if (!birth_place) {
            console.log(birth_place);
            agent.add(i18n.__("WHATS_THE_PLACE_OF_BIRTH_ERROR"));
            agent.add(city_sugg);
            agent.add(country_sugg);
            agent.context.set('conversation', 5, {'askedFor': 'place', 'birthPlace': birth_place});
        } else {
            console.log(birth_place + ", confirming as birth place");
            return location_service.confirmExactBirthPlace(agent, birth_place);
        }
    }

    function askToConfirmOrForYear(agent) {
        let contextParameters = agent.context.get('conversation').parameters;
        const initialIntent = contextParameters.initialIntent;

        if ('time' === contextParameters.askedFor) {
            console.log("actually asked for time, not date/year...");
            agent.add(i18n.__("TIME_OF_BIRTH_ERROR"));
            return askForBirthTime(agent);
        }

        if ('place' === contextParameters.askedFor) {
            console.log("actually asked for place, not date/year...");
            agent.add(i18n.__("PLACE_OF_BIRTH_ERROR"));
            return askForBirthPlace(agent);
        }

        let birthDay = (agent.parameters.birthDay) ? agent.parameters.birthDay : contextParameters.birthDay;
        const birthYear = (agent.parameters.birthYear) ? agent.parameters.birthYear : contextParameters.birthYear;
        console.log(birthDay + ' (birth day); ' + birthYear + ' (birth year)');
        if (!birthDay) {
            agent.add(i18n.__('DIDNT_CATCH_THAT'));
            askForBirthDay(agent);
        } else {
            if (!birthYear) {
                if (utils.withinAYearFromNow(birthDay)) {
                    if ('PlanetSign' === initialIntent && utils.isSun(contextParameters.planet)) {//2019-01-01, Sun sign
                        return confirmBirthDay(agent, birthDay.slice(5), true);
                    } else {//2019-01-01, Full chart
                        return askForBirthYear(agent);
                    }
                } else {//1985-01-01
                    return confirmBirthDay(agent, birthDay, false);
                }
            } else {//2019-01-01, 1983
                if ('time' === contextParameters.askedFor) {
                    console.log("!!!!! ASKED FOR TIME, BUT PROCESSING AS YEAR");
                    agent.add(i18n.__("TIME_OF_BIRTH_ERROR"));
                    return askForBirthTime(agent);
                }

                if (birthYear < 1550 || birthYear > 2649) {
                    let return_speech = i18n.__("DATE_RANGE_ERROR");
                    console.log(return_speech, " (askToConfirmOrForYear)");
                    agent.add(return_speech);
                    agent.add(year_sugg);
                } else {
                    let newBirthDay = birthYear + birthDay.substring(4, birthDay.length);
                    agent.context.set('conversation', 5, {'birthDay': newBirthDay});
                    return confirmBirthDay(agent, newBirthDay, false);
                }
            }
        }
    }

    function handleIDontKnowResponse(agent) {
        let askedFor = agent.context.get('conversation').parameters['askedFor'];
        console.log('I dont know, for - ' + askedFor);
        if ('date' === askedFor) {
            return askForBirthDay(agent);
        } else if ('year' === askedFor) {
            return askForBirthYear(agent);
        } else if ('place' === askedFor) {
            // utils.addToContext(agent, 'birthPlace', 'unknown');
            // agent.context.set('conversation', 5, {'birthPlace': "unknown"});
            // agent.context.set('conversation').parameters['birthPlace'] = "unknown";//todo
            return tryToSpeakChartWithParams(agent, false, true);
        } else if ('time' === askedFor) {
            // agent.context.set('conversation', 5, {'birthTime': "unknown"});
            // utils.addToContext(agent, 'birthTime', 'unknown');
            // agent.context.get('conversation').parameters['birthTime'] = "unknown";//todo doesnt push the context, just adds some additional info, move that to down
            return tryToSpeakChartWithParams(agent, true, false);
        }
        return tryToSpeakChartWithParams(agent, false, false);
    }

    function handleNo(agent) {
        let askedFor = agent.context.get('conversation').parameters['askedFor'];
        console.log('No, for: ' + askedFor);
        if ('time' === askedFor) {
            return askForBirthTime(agent);
        } else
        // if ('year' === askedFor) {
            return askForBirthDay(agent);
        // }
    }

    function tryToSpeakChart() {
        return tryToSpeakChartWithParams(agent, false, false);
    }

    function tryToSpeakChartWithParams(agent, birthTimeUnknown, birthPlaceUnknown) {
        let context_params = agent.context.get('conversation').parameters;
        const birthDay = context_params.birthDay;
        const birthTime = (birthTimeUnknown) ? 'unknown' : context_params.birthTime;
        const birthPlace = (birthPlaceUnknown) ? 'unknown' : context_params.birthPlace;
        // const spoken_birth_place = context_params.birthPlaceFullName;
        //SET THE CONTEXT HERE, BECAUSE IF THE CONTEXT IS ALREADY SET, THEN GET WILL NOT WORK - WTF???
        let context = {};
        if ('unknown' === birthTime) context.birthTime = "unknown";
        if ('unknown' === birthPlace) context.birthPlace = "unknown";
        // if ('unknown' === birthPlace) agent.context.set('conversation', 5, {'birthPlace': "unknown"});
        // if ('unknown' === birthTime) agent.context.set('conversation', 5, {'birthTime': "unknown"});
        // if ('unknown' === birthPlace) agent.context.set('conversation', 5, {'birthPlace': "unknown"});

        utils.debug(birthDay + ' (bday), ' + birthTime + ' (time), ' + birthPlace + ' (place)');
        if (!birthDay) return askForBirthDay(agent);
        if ('FullChart' === context_params.initialIntent) {
            if (!birthTime) return askForBirthTime(agent);
            if (!birthPlace) return askForBirthPlace(agent, context);
            return charts_service.getChart(birthDay, (birthTime === 'unknown') ? null : birthTime, context_params.birthLat, context_params.birthLng, context_params.birthTimeZoneOffset).then(function (result) {
                let return_speech = i18n.__("NATAL_CHART");
//  "NATAL_CHART_OF_PERSON_BORN_ON": "Here is the natal chart of the person born on %s",
//  "PLANET_SIGN_OF_PERSON_BORN_ON": "The %s sign of a person born on %s is %s",
                // let spoken_date = (utils.withinAYearFromNow(birthDay) ? new Date(birthDay).toLocaleString(locale, {month: "long", day: "numeric"}) : birthDay);
                // let return_speech = i18n.__("NATAL_CHART_OF_PERSON_BORN_ON", spoken_date);
                // if (birthTime && birthTime !== 'unknown') {
                //     let spoken_time = new Date(birthDay + ' ' + birthTime).toLocaleString(locale, {hour: 'numeric', hour12: true, minute: 'numeric'});
                //     return_speech += i18n.__("AT_TIME", spoken_time);
                // }
                // if (spoken_birth_place) return_speech += i18n.__("IN_PLACE", spoken_birth_place);
                // return_speech += ': \n';
                let missing = '';
                result.forEach((characteristicInSign) => {
                    if (characteristicInSign.sign.includes('-')) {
                        missing += i18n.__(characteristicInSign.characteristic) + ', ';
                    } else {
                        return_speech += i18n.__("OBJECT_IN_SIGN", i18n.__(characteristicInSign.characteristic), i18n.__(characteristicInSign.sign));
                    }
                });
                if (missing !== '') return_speech += i18n.__("MISSING_OBJECTS", missing);
                console.log('FULL CHART RESPONSE  - ', return_speech);
                let conv = agent.conv();
                conv.close(return_speech);
                agent.add(conv);
                // agent.context.set('conversation', 5, agent.context.get('conversation').parameters);
            }).catch(function (error) {
                console.error(error);
            });
        } else if ('PlanetSign' === context_params.initialIntent) {
            return charts_service.getChart(birthDay, (birthTime === 'unknown') ? null : birthTime, context_params.birthLat, context_params.birthLng, context_params.birthTimeZoneOffset).then(function (result) {
                let requested_planet = context_params.planet;
                if (!requested_planet) requested_planet = 'Sun';
                result.forEach((characteristicInSign) => {
                    if (requested_planet.toUpperCase() === characteristicInSign.characteristic.toUpperCase()) {
                        let return_speech;
                        if (characteristicInSign.sign.includes('-')) {
                            if (!birthTime) return askForBirthTime(agent);
                            if (!birthPlace) return askForBirthPlace(agent);
                            let whats_missing = '';
                            if (birthTime === 'unknown') whats_missing = i18n.__("TIME");
                            if (birthPlace === 'unknown') {
                                if (whats_missing !== '') whats_missing += i18n.__("AND");
                                whats_missing += i18n.__("PLACE");
                            }
                            return_speech = i18n.__("MISSING_INFO", whats_missing);
                        } else {
                            let spoken_planet = i18n.__(requested_planet.charAt(0).toUpperCase() + requested_planet.slice(1));
                            // let birth_details = utils.withinAYearFromNow(birthDay) ? new Date(birthDay).toLocaleString(locale, {month: "long",day: "numeric"}) : birthDay;
                            // if (birthTime && birthTime !== 'unknown') {
                            //     let spoken_time = new Date(birthDay + ' ' + birthTime).toLocaleString(locale, {hour: 'numeric', hour12: true, minute: 'numeric'});
                            //     birth_details += i18n.__("AT_TIME", spoken_time);
                            // }
                            // if (spoken_birth_place) birth_details += i18n.__("IN_PLACE", spoken_birth_place);
                            // return_speech = i18n.__("PLANET_SIGN", spoken_planet, birth_details, i18n.__(characteristicInSign.sign));
                            return_speech = i18n.__("PLANET_SIGN", spoken_planet, i18n.__(characteristicInSign.sign));
                            console.log('PLANET SIGN RESPONSE - ', return_speech);
                        }
                        let conversation = agent.conv();
                        conversation.close(return_speech);
                        agent.add(conversation);
                        // agent.context.set('conversation', 5, agent.context.get('conversation').parameters);
                    }
                });
            }).catch(function (error) {
                console.error(error);
            });
        }
    }

    function maintanance(agent) {
        // agent.context.get('conversation').parameters['askedFor'] = 'date';
        // agent.context.set('conversation', 5, agent.context.get('conversation').parameters);
        // let return_speech = i18n.__('WHATS_THE_DATE_OF_BIRTH');
        // console.log(return_speech, ' (askForBirthDay)');
        let conversation = agent.conv();
        conversation.close(i18n.__("MAINTENANCE"));
        agent.add(conversation);
        // agent.add(full_date_sugg);
    }


    let intentMap = new Map();
    // intentMap.set('Birth Day Intent', maintanance);
    // intentMap.set('Birth Day Intent - Confirm Date', maintanance);
    // intentMap.set('Birth Year Intent', maintanance);
    // intentMap.set('Birth Year Intent - Confirm Date', maintanance);
    // intentMap.set('Birth Year Intent - Deny Date', maintanance);
    // intentMap.set('Birth Time Intent - no', maintanance);
    // intentMap.set('Birth Time Intent - Confirm Time', maintanance);
    // intentMap.set('Birth Place Intent', maintanance);
    // intentMap.set('Birth Place Intent - Confirm Place', maintanance);
    // intentMap.set('I Dont Know Intent', maintanance);
    //
    intentMap.set('Birth Day Intent', askToConfirmOrForYear);
    intentMap.set('Birth Day Intent - Confirm Date', tryToSpeakChart);
    intentMap.set('Birth Year Intent', askToConfirmOrForYear);
    intentMap.set('Birth Year Intent - Confirm Date', tryToSpeakChart);
    intentMap.set('Birth Year Intent - Deny Date', handleNo);
    intentMap.set('Birth Time Intent - no', handleNo);
    intentMap.set('Birth Time Intent - Confirm Time', tryToSpeakChart);
    intentMap.set('Birth Place Intent', confirmBirthPlace);
    intentMap.set('Birth Place Intent - Confirm Place', tryToSpeakChart);
    intentMap.set('I Dont Know Intent', handleIDontKnowResponse);


    agent.handleRequest(intentMap);
});