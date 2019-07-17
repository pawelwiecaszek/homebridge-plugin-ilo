'use strict'

let Service, Characteristic
const https = require('https');

module.exports = (homebridge) => {
  /* this is the starting point for the plugin where we register the accessory */
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-plugin-ilo', 'IloSwitch', SwitchAccessory)
}

class SwitchAccessory {
  constructor (log, config) {
    /*
     * The constructor function is called when the plugin is registered.
     * log is a function that can be used to log output to the homebridge console
     * config is an object that contains the config for this plugin that was defined the homebridge config.json
     */

    /* assign both log and config to properties on 'this' class so we can use them in other methods */
    this.log = log
    this.config = config

    this.user = config['user']
    this.password = config['password']
    this.server= config['server']

    /*
     * A HomeKit accessory can have many "services". This will create our base service,
     * Service types are defined in this code: https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js
     * Search for "* Service" to tab through each available service type.
     * Take note of the available "Required" and "Optional" Characteristics for the service you are creating
     */
    this.service = new Service.Switch(this.config.name)
  }

  getStatus () {
    var AUTH   = 'Basic ' + Buffer.from(this.user + ':' + this.password).toString('base64')
    var HEADER = {'Host': this.server, 'Authorization': AUTH}
    return new Promise(resolve => {
      const options = {
        hostname: this.server,
        port: 443,
        path: '/redfish/v1/Chassis/1/',
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH
        }
      }

      const req = https.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          //console.log(JSON.parse(chunk).Status.State)
          resolve(JSON.parse(chunk).Status.State);
        });

      });

      req.on('error', (error) => {
        console.error(error)
      })
      req.end();
    });
  }

  TurnOn () {
    var AUTH   = 'Basic ' + Buffer.from(this.user + ':' + this.password).toString('base64')
    var HEADER = {'Host': this.server, 'Authorization': AUTH}
    return new Promise(resolve => {

      this.getStatus()
      .then(status => {

        if (status == "Disabled")
        {
          const data = JSON.stringify({
            Action: 'Reset',
            ResetType: 'PushPowerButton'
          })

          const options = {
            hostname: this.server,
            port: 443,
            path: '/redfish/v1/Systems/1/',
            method: 'POST',
            rejectUnauthorized: false,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': AUTH
            }
          }

          const req = https.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
              //console.log(JSON.parse(chunk))
              resolve(JSON.parse(chunk));
            });

          });

          req.on('error', (error) => {
            console.error(error)
          })

          req.write(data)
          req.end();

        } else {
          console.log("Server already started!")
        }
      });
    });
  }

  TurnOff () {
    var AUTH   = 'Basic ' + Buffer.from(this.user + ':' + this.password).toString('base64')
    var HEADER = {'Host': this.server, 'Authorization': AUTH}
    return new Promise(resolve => {

      this.getStatus()
      .then(status => {

        if (status != "Disabled")
        {
          const data = JSON.stringify({
            Action: 'Reset',
            ResetType: 'PushPowerButton'
          })

          const options = {
            hostname: this.server,
            port: 443,
            path: '/redfish/v1/Systems/1/',
            method: 'POST',
            rejectUnauthorized: false,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': AUTH
            }
          }

          const req = https.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
              //console.log(JSON.parse(chunk))
              resolve(JSON.parse(chunk));
            });

          });

          req.on('error', (error) => {
            console.error(error)
          })

          req.write(data)
          req.end();

        } else {
          console.log("Server already powered off!")
        }
      });
    });
  }

  getServices () {
    /*
     * The getServices function is called by Homebridge and should return an array of Services this accessory is exposing.
     * It is also where we bootstrap the plugin to tell Homebridge which function to use for which action.
     */

     /* Create a new information service. This just tells HomeKit about our accessory. */
    const informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, 'HPE')
        .setCharacteristic(Characteristic.Model, 'iLOSwitch')
        .setCharacteristic(Characteristic.SerialNumber, '123-4820-333')

    /*
     * For each of the service characteristics we need to register setters and getter functions
     * 'get' is called when HomeKit wants to retrieve the current state of the characteristic
     * 'set' is called when HomeKit wants to update the value of the characteristic
     */
    this.service.getCharacteristic(Characteristic.On)
      .on('get', this.getOnCharacteristicHandler.bind(this))
      .on('set', this.setOnCharacteristicHandler.bind(this))

    /* Return both the main service (this.service) and the informationService */
    return [informationService, this.service]
  }

  setOnCharacteristicHandler (value, callback) {
    /* this is called when HomeKit wants to update the value of the characteristic as defined in our getServices() function */

    /*
     * The desired value is available in the `value` argument.
     * This is just an example so we will just assign the value to a variable which we can retrieve in our get handler
     */
    this.isOn = value
    if (this.isOn == true )
    {
      this.TurnOn();
    }
    else {
      this.TurnOff();
    }

    /* Log to the console the value whenever this function is called */
    this.log(`calling setOnCharacteristicHandler`, value)

    /*
     * The callback function should be called to return the value
     * The first argument in the function should be null unless and error occured
     */
    callback(null)
  }

  getOnCharacteristicHandler (callback) {
    /*
     * this is called when HomeKit wants to retrieve the current state of the characteristic as defined in our getServices() function
     * it's called each time you open the Home app or when you open control center
     */

    /* Log to the console the value whenever this function is called */
    this.log(`calling getOnCharacteristicHandler`, this.isOn)

    this.getStatus()
    .then(status => {
      this.log(`Ilo Status is: `, status)
      if (status == "Disabled") {
        this.isOn = false;
      }
      else {
        this.isOn = false;
      }
    });

    /*
     * The callback function should be called to return the value
     * The first argument in the function should be null unless and error occured
     * The second argument in the function should be the current value of the characteristic
     * This is just an example so we will return the value from `this.isOn` which is where we stored the value in the set handler
     */
     callback(null, this.isOn)
  }

}
