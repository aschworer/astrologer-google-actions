let PropertiesReader = require('properties-reader');
let properties = PropertiesReader('servicekeys.file');
let flatlibKeyId = properties.get('flatlib.lambda.keyId');
let flatlibSecretKey = properties.get('flatlib.lambda.key');

let AWS = require("aws-sdk");
AWS.config.update({accessKeyId: flatlibKeyId, secretAccessKey: flatlibSecretKey});
let lambda = new AWS.Lambda({region: 'us-east-1', apiVersion: '2015-03-31'});

module.exports = {
    getChart: function (birthDay, birthTime, birthLat, birthLng, timezone) {
        let pullResults;
        let pullParams = {
            FunctionName: 'flatlib',
            InvocationType: 'RequestResponse',
            LogType: 'None',
            Payload: JSON.stringify({'date': birthDay.replace(/-/g, "/"), 'lng': birthLng, 'lat': birthLat, 'time': birthTime, 'timezone': timezone})
        };
        console.log("--------- getChart(): flatlib request - ", pullParams.Payload);
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
                        console.log('chart from lambda:', pullResults);
                        return resolve(pullResults);
                    }
                )
            }
        );
    }
};
