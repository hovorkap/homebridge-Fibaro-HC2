export enum DimmerControlledDevice {
	Other_Device = "1",
	Garage_Door = "16",
	Blinds = "18",
	Inner_Blinds = "19",
	Lighting = "23"
}

export enum SwitchControlledDevice {
	Lighting = "2",
	Sprinkler = "3",
	PIN = "4",
	Bedside_Lamp = "5",
	Kettle = "6",
	Wall_lamp = "7",
	Air_Conditioner = "8",
	Alarm_Breach = "9",
	Coffee_Maker = "10",
	Garden_Lamp = "11",
	TV_set = "12",
	Ceiling_Fan = "13",
	Toaster = "14",
	Radio = "15",
	Roof_Window = "17",
	Other_Device = "20",
	Alarm_state = "21",
	Alarm_Arming = "22",
	Video_gate_bell = "24",
	Video_gate_open = "25"
}

export enum RollerShutterControlledDevice {
	Blind_with_positioning_inactive = "53",
	Blind_with_positioning_active = "54",
	Venetian_blind = "55",
	Garage_Door_without_positioning = "56",
	Garage_Door_with_positioning = "57"

}

export enum RgbControlledDevice {
	RGBW_device = "50",
	RGB_device = "51",
	Output_Input = "52",
}

export enum BaseType {
	actor = "com.fibaro.actor",
	coDetector = "com.fibaro.coDetector",
	weather = "com.fibaro.weather",
	doorWindowSensor = "com.fibaro.doorWindowSensor",
	multiLevelSensor = "com.fibaro.multilevelSensor",
	floodSensor = "com.fibaro.floodSensor",
}
