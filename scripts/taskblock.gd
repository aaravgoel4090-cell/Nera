extends PanelContainer
class_name TaskBlock

signal drag_started(block: TaskBlock)
signal dropped_on_board(block: TaskBlock, global_pos: Vector2)

var data: TaskData
var is_dragging: bool = false
var is_on_timetable: bool = false

var emoji_label: Label
var title_label: Label
var meta_label: Label

func _ready() -> void:
	_resolve_labels()

func _resolve_labels() -> void:
	emoji_label = get_node_or_null("HBoxContainer/EmojiLabel") as Label
	title_label = get_node_or_null("HBoxContainer/VBoxContainer/TitleLabel") as Label
	meta_label = get_node_or_null("HBoxContainer/VBoxContainer/MetaLabel") as Label

	# Fallback search by node name if hierarchy differs slightly
	if emoji_label == null:
		emoji_label = find_child("EmojiLabel", true, false) as Label
	if title_label == null:
		title_label = find_child("TitleLabel", true, false) as Label
	if meta_label == null:
		meta_label = find_child("MetaLabel", true, false) as Label

func setup(task_data: TaskData, on_board: bool = false) -> void:
	if emoji_label == null or title_label == null or meta_label == null:
		_resolve_labels()

	data = task_data
	is_on_timetable = on_board

	if data != null:
		if emoji_label != null:
			emoji_label.text = data.emoji
		if title_label != null:
			title_label.text = data.title
		if meta_label != null:
			var due_day: int = int(data.due_abs_slot / 48) + 1
			meta_label.text = "%s | Due Day %d" % [data.format_duration(), due_day]

		var style := StyleBoxFlat.new()
		style.bg_color = data.get_color()
		style.corner_radius_top_left = 8
		style.corner_radius_top_right = 8
		style.corner_radius_bottom_left = 8
		style.corner_radius_bottom_right = 8
		add_theme_stylebox_override("panel", style)

		if on_board:
			custom_minimum_size = Vector2(float(data.duration_slots) * 28.0, 36.0)
		else:
			custom_minimum_size = Vector2(180.0, 44.0)

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and data != null and not data.completed:
			is_dragging = true
			drag_started.emit(self)
		elif not event.pressed and is_dragging:
			is_dragging = false
			dropped_on_board.emit(self, get_global_mouse_position())

func _process(_delta: float) -> void:
	if is_dragging:
		global_position = get_global_mouse_position() - size * 0.5
