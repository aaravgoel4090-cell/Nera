class_name TaskData
extends RefCounted

enum TaskType { SCHOOL, COACHING, STUDY, SLEEP, FREE_TIME }

var id: int
var title: String
var emoji: String
var type: TaskType
var duration_slots: int
var due_abs_slot: int
var stress_delta: float
var energy_delta: float
var passion_delta: float
var placed_day: int = -1
var placed_start_slot: int = -1
var completed: bool = false

func get_color() -> Color:
	match type:
		TaskType.SCHOOL:
			return Color("#4a7c59")
		TaskType.COACHING:
			return Color("#b55d3d")
		TaskType.STUDY:
			return Color("#3d6cb9")
		TaskType.SLEEP:
			return Color("#5c4d7d")
		TaskType.FREE_TIME:
			return Color("#2e8b8b")
		_:
			return Color("#666666")

func format_duration() -> String:
	var total_mins := duration_slots * 30
	var hrs := total_mins / 60
	var mins := total_mins % 60
	return "%02d:%02d" % [hrs, mins]
