let PropertiesReader = require('properties-reader');
let utils = require('./utils');
let properties = PropertiesReader('servicekeys.file');
let google_service_key = properties.get('google.service.key');
let googleMapsClient = require('@google/maps').createClient({key: google_service_key, Promise: Promise});
const {Card, Suggestion} = require('dialogflow-fulfillment');
const i18n = require('i18n');
// const moment = require('moment');
i18n.configure({
    locales: ['en-US', 'fr-FR', 'fr-CA', 'ru-RU'],
    directory: __dirname + '/locales',
    defaultLocale: 'en-US'
});

module.exports = {
    confirmExactBirthPlace: function (agent, birth_place) {
        let locale = agent.conv().user.locale;
        i18n.setLocale(locale);
        const yes_sugg = new Suggestion(i18n.__("YES"));
        const no_sugg = new Suggestion(i18n.__("NO"));
        const city_sugg = new Suggestion(i18n.__("CITY_EXAMPLE"));
        const country_sugg = new Suggestion(i18n.__("COUNTRY_EXAMPLE"));
        let context_params = agent.context.get('conversation').parameters;

        let dobtimestamp = "2000" + context_params.birthDay.substring(4, context_params.birthDay.length);
        // console.log(dobtimestamp);
        if (context_params.birthTime && context_params.birthTime !== 'unknown') dobtimestamp += " " + context_params.birthTime;
        // console.log(dobtimestamp);
        dobtimestamp = Math.floor(Date.parse(dobtimestamp) / 1000);
        // console.log(dobtimestamp);
        console.log('timestamp: '   + dobtimestamp);

        agent.context.set('conversation', 5, {'birthPlace': birth_place});

        return googleMapsClient.geocode({address: birth_place, language: locale.slice(3)}).asPromise()
            .then((response) => {
                    let latitude;
                    let longitude;
                    let fullname;
                    let is_country;
                    response.json.results.forEach((place) => {
                        place.address_components[0].types.forEach((actype) => {
                            if ('country' === actype || 'locality' === actype || 'Québec' === place) {
                                if ('country' === actype) is_country = true;
                                latitude = place.geometry.location.lat;
                                longitude = place.geometry.location.lng;
                                fullname = getFullName(place);
                            } else {
                                utils.debug(place.address_components[0].short_name + ' - filtering out because type = ' + actype);
                            }
                        });
                    });
                    if (!latitude) {
                        agent.context.set('conversation', 5, {'askedFor': 'place'});
                        agent.add(i18n.__("WHATS_THE_PLACE_OF_BIRTH_ERROR"));
                        agent.add(city_sugg);
                        agent.add(country_sugg);
                    } else {
                        return resolveTimezone(latitude, longitude, locale, dobtimestamp)
                            .then(function (gmtOffset) {
                                let return_speech = i18n.__("IS_IT", ((is_country) ? i18n.__("COUNTRY") : '') + fullname);
                                console.log(return_speech, ' (confirmBirthPlace)');
                                agent.add(return_speech);
                                agent.add(yes_sugg);
                                agent.add(no_sugg);
                                agent.context.set('conversation', 5, {'birthLat': latitude, 'birthLng': longitude,'birthPlace': fullname, 'birthTimeZoneOffset': gmtOffset});
                            }).catch(function (error) {
                                console.error('confirmBirthPlace: ', error);
                                agent.context.set('conversation', 5, {'askedFor': 'place'});
                                agent.add(i18n.__("WHATS_THE_PLACE_OF_BIRTH_ERROR"));
                                agent.add(city_sugg);
                                agent.add(country_sugg);
                            });
                    }
                }
            ).catch(function (error) {
                console.error('confirmBirthPlace: ', error);
                // agent.context.get('conversation').parameters['askedFor'] = 'place';
                agent.context.set('conversation', 5, {'askedFor': 'place'});
                // agent.context.set('conversation', 5, agent.context.get('conversation').parameters);
                agent.add(i18n.__("WHATS_THE_PLACE_OF_BIRTH_ERROR"));
                agent.add(city_sugg);
                agent.add(country_sugg);
            });
    }
};

function resolveTimezone(latitude, longitude, locale, dobtimestamp) {
    return googleMapsClient.timezone({
        location: [latitude, longitude],
        timestamp: dobtimestamp,
        language: locale.slice(3)
    }).asPromise().then((response) => {
        let hours = Math.floor(response.json.rawOffset / 3600);
        let isNegative = hours < 0;
        hours = Math.abs(hours);
        let minutes = parseInt((response.json.rawOffset / 60) % 60);
        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        hours = (isNegative) ? "-" + hours : "+" + hours;
        return Promise.resolve(hours + ":" + minutes);
    }).catch(function (error) {
        console.error('resolveTimezone: ', error);
        return Promise.reject(error);
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
    return (city) ? city + i18n.__("IN_COUNTRY") + country : country;
}
