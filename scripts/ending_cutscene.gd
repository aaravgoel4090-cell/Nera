extends Control

const GAME_SCENE := "res://scenes/Game.tscn"

@onready var video_player: VideoStreamPlayer = $VideoPlayer
@onready var replay_btn: Button = $ReplayButton

func _ready() -> void:
	replay_btn.pressed.connect(_on_replay_pressed)
	if video_player.stream != null:
		video_player.play()

func _on_replay_pressed() -> void:
	get_tree().change_scene_to_file(GAME_SCENE)
