import './EndingScreen.css'

interface EndingScreenProps {
  weeks: number
  attendance: number
  onRestart: () => void
}

export function EndingScreen({ weeks, attendance, onRestart }: EndingScreenProps) {
  return (
    <div className="ending">
      <div className="ending__card">
        <p className="ending__eyebrow">Ending · The long way up</p>
        <h1>Nera chooses a different timetable.</h1>
        <p className="ending__body">
          She never beat the system. The hours were always going to be too many, and the
          answers were never going to be simple. So she stopped trying to survive the
          timetable and started asking who wrote it.
        </p>
        <p className="ending__body">
          Nera began learning computer science on her own. She researched the Indian
          education system — who it serves, who it leaves behind, and why the same day
          keeps repeating. She tried new ways to learn: projects instead of drills,
          questions instead of memorised steps.
        </p>
        <p className="ending__body">
          Then she found Hack Club. Other students, building things, fixing things,
          refusing to accept that school is the only place learning can happen. Together
          they started making education worth showing up for.
        </p>
        <div className="ending__stats">
          <span>Weeks survived: <strong>{weeks}</strong></span>
          <span>Attendance: <strong>{attendance}%</strong></span>
        </div>
        <button type="button" className="ending__button" onClick={onRestart}>
          Start again
        </button>
      </div>
    </div>
  )
}
