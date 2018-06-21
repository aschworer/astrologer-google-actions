module.exports = {

    withinAYearFromNow: function (dateStr) {
        let date = Date.parse(dateStr);
        let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDay());
        let dateInAYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDay());
        return date === today || (date < dateInAYear && date > today);
    },

    speak_characteristic: function (characteristic) {
        if (characteristic.toLowerCase().includes('house')) {
            let houseNo;
            houseNo = characteristic.slice(5);
            //console.log(houseNo);
            if (houseNo == '1') {
                return 'Ascendant';
            } else if (houseNo == '10') {
                return 'Midheaven';
            }
            return ordinal_suffix_of(houseNo) + ' House';
        } else {
            return characteristic;
        }
    },

    isSun: function (requested_planet) {
        requested_planet = requested_planet.toLowerCase();
        return 'sun' === requested_planet || 'zodiac' === requested_planet || 'astrology' === requested_planet || 'astrological' === requested_planet;
    }

};

function ordinal_suffix_of(i) {
    let j = i % 10,
        k = i % 100;
    if (j === 1 && k !== 11) {
        return i + "st";
    }
    if (j === 2 && k !== 12) {
        return i + "nd";
    }
    if (j === 3 && k !== 13) {
        return i + "rd";
    }
    return i + "th";
}