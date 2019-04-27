//    Copyright 2018 ilcato
// 
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
// 
//        http://www.apache.org/licenses/LICENSE-2.0
// 
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

// Fibaro Home Center 2 Platform plugin for HomeBridge

'use strict';

export const pluginName = 'homebridge-fibaro-hc2';
export const platformName = 'FibaroHC2';

export class ShadowService {
	controlService: any;
	characteristics: any[];

	constructor(controlService, characteristics: any[]) {
		this.controlService = controlService;
		this.characteristics = characteristics;
	}
}

export class ShadowAccessory {

	name: string;
	roomID: string;
	services: ShadowService[];
	accessory: any;
	hapAccessory: any;
	hapService: any;
	hapCharacteristic: any;
	platform: any;
	isSecuritySystem: boolean;
	device: any;

	constructor(device: any, services: ShadowService[], hapAccessory: any, hapService: any, hapCharacteristic: any, platform, isSecuritySystem: boolean = false) {
		this.name = device.name;
		this.roomID = device.roomID;
		this.services = services;
		this.accessory = null;
		this.hapAccessory = hapAccessory;
		this.hapService = hapService;
		this.hapCharacteristic = hapCharacteristic;
		this.platform = platform;
		this.isSecuritySystem = isSecuritySystem;
		this.device = {id: device.id, name: device.name, type: device.type, properties: device.properties};

		for (let i = 0; i < services.length; i++) {
			if (services[i].controlService.subtype == undefined)
				services[i].controlService.subtype = device.id + "----"			// DEVICE_ID-VIRTUAL_BUTTON_ID-RGB_MARKER-OPERATING_MODE_ID-PLUGIN_MARKER
		}
	}

	initAccessory() {
		let manufacturer = (this.device.properties.zwaveCompany || "IlCato").replace("Fibargroup", "Fibar Group");
		this.accessory.getService(this.hapService.AccessoryInformation)
			.setCharacteristic(this.hapCharacteristic.Manufacturer, manufacturer)
			.setCharacteristic(this.hapCharacteristic.Model, `${this.device.type || "HomeCenterBridgedAccessory"}`)
			.setCharacteristic(this.hapCharacteristic.SerialNumber, `${this.device.properties.serialNumber || "<unknown>"}`)
			.setCharacteristic(this.hapCharacteristic.FirmwareRevision, this.device.properties.zwaveVersion);
	}

	removeNoMoreExistingServices() {
		for (let t = 0; t < this.accessory.services.length; t++) {
			let found = false;
			for (let s = 0; s < this.services.length; s++) {
				// TODO: check why test for undefined
				if (this.accessory.services[t].displayName == undefined || this.services[s].controlService.displayName == this.accessory.services[t].displayName) {
					found = true;
					break;
				}
			}
			if (!found) {
				this.accessory.removeService(this.accessory.services[t]);
			}
		}
	}

	addNewServices(platform) {
		for (let s = 0; s < this.services.length; s++) {
			let service = this.services[s];
			let serviceExists = this.accessory.getService(service.controlService.displayName);
			if (!serviceExists) {
				this.accessory.addService(service.controlService);
				for (let i = 0; i < service.characteristics.length; i++) {
					let characteristic = service.controlService.getCharacteristic(service.characteristics[i]);
					characteristic.props.needsBinding = true;
					if (characteristic.UUID == (new this.hapCharacteristic.CurrentAmbientLightLevel()).UUID) {
						characteristic.props.maxValue = 10000;
						characteristic.props.minStep = 1;
						characteristic.props.minValue = 0;
					}
					if (characteristic.UUID == (new this.hapCharacteristic.CurrentTemperature()).UUID) {
						characteristic.props.minValue = -50;
					}
					platform.bindCharacteristicEvents(characteristic, service.controlService);
				}
			}
		}
	}

	registerUpdateAccessory(isNewAccessory, api) {
		if (isNewAccessory)
			api.registerPlatformAccessories(pluginName, platformName, [this.accessory]);
		else
			api.updatePlatformAccessories([this.accessory]);
		this.accessory.reviewed = true; // Mark accessory as reviewed in order to remove the not reviewed ones
	}

	setAccessory(accessory) {
		this.accessory = accessory;
	}
}

export class ShadowFactory {
	hapAccessory: any;
	hapService: any;
	hapCharacteristic: any;
	platform: any;

	constructor(hapAccessory: any, hapService: any, hapCharacteristic: any, platform: any) {
		this.hapAccessory = hapAccessory;
		this.hapService = hapService;
		this.hapCharacteristic = hapCharacteristic;
		this.platform = platform;
	}

	createShadowAccessory(device: any, siblings: any) {
		let ss;
		let controlService, controlCharacteristics;

		switch (device.type) {
			case "com.fibaro.multilevelSwitch":
			case "com.fibaro.FGD212":
				switch (device.properties.deviceControlType) {
					case "2": // Lighting
					case "23": // Lighting
						controlService = new this.hapService.Lightbulb(device.name);
						controlCharacteristics = [this.hapCharacteristic.On, this.hapCharacteristic.Brightness];
						break;
					default:
						controlService = new this.hapService.Switch(device.name);
						controlCharacteristics = [this.hapCharacteristic.On];
						break;
				}
				ss = [new ShadowService(controlService, controlCharacteristics)];
				break;
			case "com.fibaro.binarySwitch":
			case "com.fibaro.developer.bxs.virtualBinarySwitch":
			case "com.fibaro.satelOutput":
				switch (device.properties.deviceControlType) {
					case "2": // Lighting
					case "5": // Bedside Lamp
					case "7": // Wall Lamp
						controlService = new this.hapService.Lightbulb(device.name);
						controlCharacteristics = [this.hapCharacteristic.On];
						break;
					case "25": // Video gate open
						controlService = new this.hapService.LockMechanism(device.name);
						controlService.subtype = device.id + "----" + "LOCK";
						controlCharacteristics = [this.hapCharacteristic.LockCurrentState, this.hapCharacteristic.LockTargetState];
						break;
					default:
						controlService = new this.hapService.Switch(device.name);
						controlCharacteristics = [this.hapCharacteristic.On];
						break;
				}
				ss = [new ShadowService(controlService, controlCharacteristics)];
				break;
			case "com.fibaro.barrier":
				ss = [new ShadowService(new this.hapService.GarageDoorOpener(device.name), [this.hapCharacteristic.CurrentDoorState, this.hapCharacteristic.TargetDoorState, this.hapCharacteristic.ObstructionDetected])];
				break;
			case "com.fibaro.FGR221":
			case "com.fibaro.FGRM222":
			case "com.fibaro.FGR223":
			case "com.fibaro.rollerShutter":

				controlService = new this.hapService.WindowCovering(device.name);
				controlCharacteristics = [
					this.hapCharacteristic.CurrentPosition,
					this.hapCharacteristic.TargetPosition,
					this.hapCharacteristic.PositionState
				];
				if (device.actions.setValue2 == 1) {
					controlCharacteristics.push(
						this.hapCharacteristic.CurrentHorizontalTiltAngle,
						this.hapCharacteristic.TargetHorizontalTiltAngle
					);
				}
				ss = [new ShadowService(controlService, controlCharacteristics)];
				break;
			case "com.fibaro.FGMS001":
			case "com.fibaro.FGMS001v2":
			case "com.fibaro.motionSensor":
				ss = [new ShadowService(new this.hapService.MotionSensor(device.name), [this.hapCharacteristic.MotionDetected])];
				break;
			case "com.fibaro.temperatureSensor":
				ss = [new ShadowService(new this.hapService.TemperatureSensor(device.name), [this.hapCharacteristic.CurrentTemperature])];
				break;
			case "com.fibaro.humiditySensor":
				ss = [new ShadowService(new this.hapService.HumiditySensor(device.name), [this.hapCharacteristic.CurrentRelativeHumidity])];
				break;
			case "com.fibaro.doorSensor":
			case "com.fibaro.windowSensor":
			case "com.fibaro.satelZone":
				ss = [new ShadowService(new this.hapService.ContactSensor(device.name), [this.hapCharacteristic.ContactSensorState])];
				break;
			case "com.fibaro.FGFS101":
			case "com.fibaro.floodSensor":
				ss = [new ShadowService(new this.hapService.LeakSensor(device.name), [this.hapCharacteristic.LeakDetected])];
				break;
			case "com.fibaro.FGSS001":
			case "com.fibaro.smokeSensor":
				ss = [new ShadowService(new this.hapService.SmokeSensor(device.name), [this.hapCharacteristic.SmokeDetected])];
				break;
			case "com.fibaro.FGCD001":
				ss = [new ShadowService(new this.hapService.CarbonMonoxideSensor(device.name), [this.hapCharacteristic.CarbonMonoxideDetected, this.hapCharacteristic.CarbonMonoxideLevel, this.hapCharacteristic.CarbonMonoxidePeakLevel, this.hapCharacteristic.BatteryLevel])];
				break;
			case "com.fibaro.lightSensor":
				ss = [new ShadowService(new this.hapService.LightSensor(device.name), [this.hapCharacteristic.CurrentAmbientLightLevel])];
				break;
			case "com.fibaro.FGWP101":
			case "com.fibaro.FGWP102":
			case "com.fibaro.FGWPG111":
				ss = [new ShadowService(new this.hapService.Outlet(device.name), [this.hapCharacteristic.On, this.hapCharacteristic.OutletInUse])];
				break;
			case "com.fibaro.doorLock":
			case "com.fibaro.gerda":
				ss = [new ShadowService(new this.hapService.LockMechanism(device.name), [this.hapCharacteristic.LockCurrentState, this.hapCharacteristic.LockTargetState])];
				break;
			case "com.fibaro.setPoint":
			case "com.fibaro.FGT001":
			case "com.fibaro.thermostatDanfoss":
			case "com.fibaro.com.fibaro.thermostatHorstmann":
				controlService = new this.hapService.Thermostat(device.name);
				controlCharacteristics = [this.hapCharacteristic.CurrentTemperature, this.hapCharacteristic.TargetTemperature, this.hapCharacteristic.CurrentHeatingCoolingState, this.hapCharacteristic.TargetHeatingCoolingState, this.hapCharacteristic.TemperatureDisplayUnits];
				// Check the presence of an associated operating mode device
				let m = siblings.get("com.fibaro.operatingMode");
				if (m) {
					controlService.operatingModeId = m.id;
					controlService.subtype = device.id + "---" + m.id;
				}
				ss = [new ShadowService(controlService, controlCharacteristics)];
				break;
			case "virtual_device":
				let pushButtonServices: Array<ShadowService> = [];
				let pushButtonService: ShadowService;
				for (let r = 0; r < device.properties.rows.length; r++) {
					if (device.properties.rows[r].type == "button") {
						for (let e = 0; e < device.properties.rows[r].elements.length; e++) {
							pushButtonService = new ShadowService(new this.hapService.Switch(device.properties.rows[r].elements[e].caption), [this.hapCharacteristic.On]);
							pushButtonService.controlService.subtype = device.id + "-" + device.properties.rows[r].elements[e].id;
							pushButtonServices.push(pushButtonService);
						}
					}
				}
				if (pushButtonServices.length > 0)
					ss = pushButtonServices;
				break;
			case "com.fibaro.FGRGBW441M":
			case "com.fibaro.colorController":
				let service = {
					controlService: new this.hapService.Lightbulb(device.name),
					characteristics: [this.hapCharacteristic.On, this.hapCharacteristic.Brightness, this.hapCharacteristic.Hue, this.hapCharacteristic.Saturation]
				};
				service.controlService.HSBValue = {hue: 0, saturation: 0, brightness: 100};
				service.controlService.RGBValue = {red: 0, green: 0, blue: 0, white: 0};
				service.controlService.countColorCharacteristics = 0;
				service.controlService.timeoutIdColorCharacteristics = 0;
				service.controlService.subtype = device.id + "--RGB";
				ss = [service];
				break;
			case "com.fibaro.logitechHarmonyActivity":
				controlService = new this.hapService.Switch(device.name);
				controlService.subtype = device.id + "----" + "HP"; 					// HP: Harmony Plugin		
				ss = [new ShadowService(controlService, [this.hapCharacteristic.On])];
				break;
			default:
				break
		}
		if (!ss) {
			return undefined;
		}

		if (ShadowFactory.hasBatteryInterface(device)) {
			ss.push(this.createBatteryService(device))
		}

		return new ShadowAccessory(device, ss, this.hapAccessory, this.hapService, this.hapCharacteristic, this.platform);
	}

	createShadowSecuritySystemAccessory(device) {
		let service = new ShadowService(new this.hapService.SecuritySystem("FibaroSecuritySystem"), [this.hapCharacteristic.SecuritySystemCurrentState, this.hapCharacteristic.SecuritySystemTargetState]);
		service.controlService.subtype = "0--";
		return new ShadowAccessory(device, [service], this.hapAccessory, this.hapService, this.hapCharacteristic, this.platform, true);
	}

	createShadowGlobalVariableSwitchAccessory(device) {
		let service = new ShadowService(new this.hapService.Switch(device.name), [this.hapCharacteristic.On]);
		service.controlService.subtype = `G-${device.name}-`;
		return new ShadowAccessory(device, [service], this.hapAccessory, this.hapService, this.hapCharacteristic, this.platform, true);
	}

	static hasBatteryInterface(device: any): boolean {
		return device.interfaces && device.interfaces.includes("battery")
	}

	createBatteryService(device) {
		return new ShadowService(
			new this.hapService.BatteryService(device.name),
			[
				this.hapCharacteristic.BatteryLevel,
				this.hapCharacteristic.StatusLowBattery
				// ,hapCharacteristic.ChargingState // not supported by fibaro
			]
		)
	}
}
