module.exports = {

    withinAYearFromNow: function (dateStr) {
        let date = Date.parse(dateStr);
        let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDay());
        let dateInAYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDay());
        return date === today || (date < dateInAYear && date > today);
    },

    isSun: function (requested_planet) {
        return 'sun' === requested_planet.toLowerCase();
    }

};