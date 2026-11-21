extends Control

const DAYS := ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SLOTS_PER_DAY := 48 # 30-min slots (00:00 to 23:30)
const TASK_BLOCK_SCENE := preload("res://scenes/TaskBlock.tscn")
const ENDING_SCENE := "res://scenes/ending_cutscene.tscn"

@onready var todo_list: VBoxContainer = get_node_or_null("HBoxContainer/todoPanel/VBoxContainer/ScrollContainer/TodoList") as VBoxContainer
@onready var spawn_btn: Button = get_node_or_null("HBoxContainer/todoPanel/VBoxContainer/SpawnTaskButton") as Button
@onready var day_label: Label = get_node_or_null("HBoxContainer/TimetablePanel/VBoxContainer/TopBar/DayLabel") as Label
@onready var clock_label: Label = get_node_or_null("HBoxContainer/TimetablePanel/VBoxContainer/TopBar/ClockLabel") as Label
@onready var speed_btn: Button = get_node_or_null("HBoxContainer/TimetablePanel/VBoxContainer/TopBar/SpeedButton") as Button
@onready var days_container: ScrollContainer = get_node_or_null("HBoxContainer/TimetablePanel/VBoxContainer/DayRowsContainer") as ScrollContainer

@onready var stress_bar: ProgressBar = get_node_or_null("HBoxContainer/StatsPanel/VBoxContainer/StressBar") as ProgressBar
@onready var energy_bar: ProgressBar = get_node_or_null("HBoxContainer/StatsPanel/VBoxContainer/Energybar") as ProgressBar
@onready var passion_bar: ProgressBar = get_node_or_null("HBoxContainer/StatsPanel/VBoxContainer/PassionBar") as ProgressBar
@onready var log_feed: RichTextLabel = get_node_or_null("HBoxContainer/StatsPanel/VBoxContainer/LogFeed") as RichTextLabel
@onready var nera_anim: AnimatedSprite2D = get_node_or_null("HBoxContainer/StatsPanel/VBoxContainer/SpritePreviewHolder/Nera") as AnimatedSprite2D

var stress: float = 25.0
var energy: float = 80.0
var passion: float = 20.0

var current_abs_slot: int = 16 # Start around 08:00 Mon (16 * 30m)
var slot_timer: float = 0.0
var seconds_per_slot: float = 1.2
var time_scale_mult: float = 1.0
var next_task_id: int = 1
var difficulty_step: int = 0

var todo_tasks: Array[TaskData] = []
var placed_tasks: Array[TaskData] = []
var slot_rects: Array = [] # slot_rects[day][slot] = Rect2 in global space
var slot_containers: Array = [] # slot_containers[day][slot] = Control
var _grid_root: VBoxContainer

func _ready() -> void:
	if stress_bar != null:
		stress_bar.max_value = 100.0
	if energy_bar != null:
		energy_bar.max_value = 100.0
	if passion_bar != null:
		passion_bar.max_value = 100.0

	if spawn_btn != null:
		spawn_btn.pressed.connect(_on_spawn_task_pressed)
	if speed_btn != null:
		speed_btn.pressed.connect(_on_speed_toggled)

	_build_timetable_grid()
	_spawn_initial_tasks()
	_update_clock_ui()
	_refresh_stats_ui()
	_log_msg("Day 1 begins. Balance Class 11 PCM, coaching, and Nera's sanity.")

func _build_timetable_grid() -> void:
	if days_container == null:
		return

	if _grid_root != null and is_instance_valid(_grid_root):
		_grid_root.queue_free()

	_grid_root = VBoxContainer.new()
	days_container.add_child(_grid_root)

	slot_rects.clear()
	slot_containers.clear()

	for d in range(DAYS.size()):
		var row := HBoxContainer.new()
		var d_lbl := Label.new()
		d_lbl.text = DAYS[d]
		d_lbl.custom_minimum_size = Vector2(44.0, 38.0)
		row.add_child(d_lbl)

		var day_slot_rects: Array[Rect2] = []
		var day_slot_nodes: Array[Control] = []

		for s in range(SLOTS_PER_DAY):
			var cell := Panel.new()
			cell.custom_minimum_size = Vector2(26.0, 38.0)
			var style := StyleBoxFlat.new()
			style.bg_color = Color("#1e222b") if int(s / 2) % 2 == 0 else Color("#252a34")
			style.border_width_left = 1 if s % 2 == 0 else 0
			style.border_color = Color("#3a4152")
			cell.add_theme_stylebox_override("panel", style)
			row.add_child(cell)
			day_slot_nodes.append(cell)
			day_slot_rects.append(Rect2())

		_grid_root.add_child(row)
		slot_containers.append(day_slot_nodes)
		slot_rects.append(day_slot_rects)

	await get_tree().process_frame
	_cache_slot_rects()

func _cache_slot_rects() -> void:
	for d in range(slot_containers.size()):
		for s in range(slot_containers[d].size()):
			var node: Control = slot_containers[d][s]
			if is_instance_valid(node):
				slot_rects[d][s] = Rect2(node.global_position, node.size)

func _process(delta: float) -> void:
	_cache_slot_rects()
	slot_timer += delta * time_scale_mult
	if slot_timer >= seconds_per_slot:
		slot_timer -= seconds_per_slot
		_advance_one_slot()

func _advance_one_slot() -> void:
	var prev_day: int = int(current_abs_slot / SLOTS_PER_DAY)
	current_abs_slot += 1
	var new_day: int = int(current_abs_slot / SLOTS_PER_DAY)

	if new_day != prev_day:
		_log_msg("New day: %s" % DAYS[new_day % DAYS.size()])
		if new_day % 2 == 0:
			difficulty_step += 1
			_spawn_random_task()

	for item in placed_tasks.duplicate():
		var t: TaskData = item
		if t == null or t.completed:
			continue
		var t_start_abs: int = t.placed_day * SLOTS_PER_DAY + t.placed_start_slot
		if current_abs_slot == t_start_abs:
			_complete_task(t)
		elif current_abs_slot > t.due_abs_slot and not t.completed:
			_fail_task(t, "Missed deadline")

	for item in todo_tasks.duplicate():
		var t: TaskData = item
		if t != null and current_abs_slot > t.due_abs_slot:
			_fail_task(t, "Expired in To-Do")

	energy = clampf(energy - 0.35, 0.0, 100.0)
	if energy < 25.0:
		stress = clampf(stress + 0.8, 0.0, 100.0)

	_update_clock_ui()
	_update_nera_animation()
	_refresh_stats_ui()
	_check_ending_condition()

func _complete_task(t: TaskData) -> void:
	t.completed = true
	stress = clampf(stress + t.stress_delta, 0.0, 100.0)
	energy = clampf(energy + t.energy_delta, 0.0, 100.0)
	passion = clampf(passion + t.passion_delta, 0.0, 100.0)
	_log_msg("%s Completed: %s" % [t.emoji, t.title])

func _fail_task(t: TaskData, reason: String) -> void:
	todo_tasks.erase(t)
	placed_tasks.erase(t)
	stress = clampf(stress + 18.0, 0.0, 100.0)
	energy = clampf(energy - 8.0, 0.0, 100.0)
	_log_msg("[color=#ff6b6b]%s (%s): Stress spiked![/color]" % [t.title, reason])
	_rebuild_todo_ui()
	_rebuild_board_blocks()

func _check_ending_condition() -> void:
	if stress >= 100.0 or (energy <= 2.0 and stress >= 75.0):
		if ResourceLoader.exists(ENDING_SCENE):
			get_tree().change_scene_to_file(ENDING_SCENE)

func _on_drag_started(block: TaskBlock) -> void:
	if block == null:
		return
	if block.get_parent() != self:
		block.reparent(self)
	block.z_index = 100

func _on_dropped_on_board(block: TaskBlock, drop_pos: Vector2) -> void:
	if block == null or block.data == null:
		return
	block.z_index = 0
	var hit: Vector2 = _find_slot_at_pos(drop_pos)
	if hit.x >= 0:
		var day_idx: int = int(hit.x)
		var slot_idx: int = int(hit.y)
		if _can_place_task(block.data, day_idx, slot_idx):
			todo_tasks.erase(block.data)
			if not placed_tasks.has(block.data):
				placed_tasks.append(block.data)
			block.data.placed_day = day_idx
			block.data.placed_start_slot = slot_idx
			_log_msg("Scheduled %s on %s" % [block.data.title, DAYS[day_idx]])
		else:
			_log_msg("Can't place %s there (overlap or out of bounds)." % block.data.title)
	else:
		placed_tasks.erase(block.data)
		block.data.placed_day = -1
		block.data.placed_start_slot = -1
		if not todo_tasks.has(block.data):
			todo_tasks.append(block.data)

	_rebuild_todo_ui()
	_rebuild_board_blocks()

func _find_slot_at_pos(pos: Vector2) -> Vector2:
	for d in range(slot_rects.size()):
		for s in range(slot_rects[d].size()):
			var r: Rect2 = slot_rects[d][s]
			if r.has_point(pos):
				return Vector2(d, s)
	return Vector2(-1, -1)

func _can_place_task(task: TaskData, day_idx: int, start_slot: int) -> bool:
	if task == null or start_slot + task.duration_slots > SLOTS_PER_DAY:
		return false
	var new_start: int = day_idx * SLOTS_PER_DAY + start_slot
	var new_end: int = new_start + task.duration_slots
	for other in placed_tasks:
		if other == task or other.placed_day < 0:
			continue
		var o_start: int = other.placed_day * SLOTS_PER_DAY + other.placed_start_slot
		var o_end: int = o_start + other.duration_slots
		if new_start < o_end and new_end > o_start:
			return false
	return true

func _rebuild_todo_ui() -> void:
	if todo_list == null or TASK_BLOCK_SCENE == null:
		return
	for child in todo_list.get_children():
		child.queue_free()
	for t in todo_tasks:
		var blk := TASK_BLOCK_SCENE.instantiate() as TaskBlock
		if blk != null:
			todo_list.add_child(blk)
			blk.setup(t, false)
			blk.drag_started.connect(_on_drag_started)
			blk.dropped_on_board.connect(_on_dropped_on_board)

func _rebuild_board_blocks() -> void:
	if TASK_BLOCK_SCENE == null:
		return
	for d in range(slot_containers.size()):
		for s in range(slot_containers[d].size()):
			var cell: Control = slot_containers[d][s]
			if is_instance_valid(cell):
				for c in cell.get_children():
					c.queue_free()

	for t in placed_tasks:
		if t.placed_day >= 0 and t.placed_start_slot >= 0:
			if t.placed_day < slot_containers.size() and t.placed_start_slot < slot_containers[t.placed_day].size():
				var blk := TASK_BLOCK_SCENE.instantiate() as TaskBlock
				if blk != null:
					slot_containers[t.placed_day][t.placed_start_slot].add_child(blk)
					blk.setup(t, true)
					blk.position = Vector2.ZERO
					blk.drag_started.connect(_on_drag_started)
					blk.dropped_on_board.connect(_on_dropped_on_board)

func _spawn_initial_tasks() -> void:
	_add_custom_task("School (11th PCM)", "🏫", TaskData.TaskType.SCHOOL, 8, current_abs_slot + 36, 12.0, -20.0, 2.0)
	_add_custom_task("JEE/Coaching Batch", "📚", TaskData.TaskType.COACHING, 4, current_abs_slot + 48, 15.0, -18.0, 1.0)
	_add_custom_task("Sleep", "😴", TaskData.TaskType.SLEEP, 12, current_abs_slot + 60, -25.0, 45.0, 5.0)
	_add_custom_task("CS / Hack Club Tinkering", "💻", TaskData.TaskType.FREE_TIME, 2, current_abs_slot + 40, -10.0, 5.0, 25.0)
	_rebuild_todo_ui()

func _spawn_random_task() -> void:
	var pool := [
		["Physics Numericals", "⚛️", TaskData.TaskType.STUDY, 2 + mini(difficulty_step, 2), 14.0, -12.0, 4.0],
		["Organic Chem Notes", "🧪", TaskData.TaskType.STUDY, 2, 12.0, -10.0, 2.0],
		["Calculus Practice", "📐", TaskData.TaskType.STUDY, 2 + mini(difficulty_step, 2), 15.0, -14.0, 3.0],
		["Sleep", "😴", TaskData.TaskType.SLEEP, 10, -22.0, 40.0, 4.0],
		["Walk & Reset", "🌿", TaskData.TaskType.FREE_TIME, 1, -12.0, 12.0, 12.0],
	]
	var pick: Array = pool[randi() % pool.size()]
	var due_horizon: int = maxi(10, 28 - difficulty_step * 3)
	_add_custom_task(str(pick[0]), str(pick[1]), pick[2] as TaskData.TaskType, int(pick[3]), current_abs_slot + due_horizon, float(pick[4]), float(pick[5]), float(pick[6]))
	_rebuild_todo_ui()

func _add_custom_task(title: String, emoji: String, t_type: TaskData.TaskType, dur: int, due: int, s_d: float, e_d: float, p_d: float) -> void:
	var t := TaskData.new()
	t.id = next_task_id
	next_task_id += 1
	t.title = title
	t.emoji = emoji
	t.type = t_type
	t.duration_slots = dur
	t.due_abs_slot = due
	t.stress_delta = s_d
	t.energy_delta = e_d
	t.passion_delta = p_d
	todo_tasks.append(t)

func _on_spawn_task_pressed() -> void:
	_spawn_random_task()

func _on_speed_toggled() -> void:
	if time_scale_mult < 1.5:
		time_scale_mult = 2.5
		if speed_btn != null:
			speed_btn.text = "Speed: 2.5x"
	else:
		time_scale_mult = 1.0
		if speed_btn != null:
			speed_btn.text = "Speed: 1x"

func _update_clock_ui() -> void:
	var day_idx: int = int(current_abs_slot / SLOTS_PER_DAY) % DAYS.size()
	var slot_in_day: int = current_abs_slot % SLOTS_PER_DAY
	var total_mins: int = slot_in_day * 30
	if day_label != null:
		day_label.text = "Day: %s" % DAYS[day_idx]
	if clock_label != null:
		clock_label.text = "%02d:%02d" % [int(total_mins / 60), total_mins % 60]

func _update_nera_animation() -> void:
	if nera_anim == null or nera_anim.sprite_frames == null:
		return
	var target_anim := "idle"
	if stress > 70.0 and nera_anim.sprite_frames.has_animation("sleep"):
		target_anim = "sleep"
	elif energy < 40.0 and nera_anim.sprite_frames.has_animation("phone"):
		target_anim = "phone"
	elif nera_anim.sprite_frames.has_animation("walk"):
		target_anim = "walk"
	if nera_anim.animation != target_anim:
		nera_anim.play(target_anim)

func _refresh_stats_ui() -> void:
	if stress_bar != null:
		stress_bar.value = stress
	if energy_bar != null:
		energy_bar.value = energy
	if passion_bar != null:
		passion_bar.value = passion

func _log_msg(msg: String) -> void:
	if log_feed != null:
		log_feed.append_text(msg + "\n")
