extends Control

const GAME_SCENE := "res://scenes/game.tscn"
const ENDING_SCENE := "res://scenes/ending_cutscene.tscn"

@onready var play_btn: Button = $VBoxContainer/PlayButton
@onready var cutscene_btn: Button = $VBoxContainer/CutscenePreviewButton

func _ready() -> void:
	play_btn.pressed.connect(func(): get_tree().change_scene_to_file(GAME_SCENE))
	cutscene_btn.pressed.connect(func(): get_tree().change_scene_to_file(ENDING_SCENE))
	
