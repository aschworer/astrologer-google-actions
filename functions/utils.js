module.exports = {

    withinAYearFromNow: function (dateStr) {
        let date = Date.parse(dateStr);
        let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDay());
        let dateInAYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDay());
        return date === today || (date < dateInAYear && date > today);
    },

    isSun: function (requested_planet) {
        requested_planet = requested_planet.toLowerCase();
        return 'sun' === requested_planet
            || 'zodiac' === requested_planet || 'astrology' === requested_planet || 'astrological' === requested_planet// todo release - remove
            ;
    }

};