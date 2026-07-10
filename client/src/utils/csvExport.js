export function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildPrBoardCsv(prRows, userName) {
  const header = [
    'Workout Tracker — PR Export',
    `User: ${userName}`,
    `Exported: ${new Date().toLocaleDateString()}`,
    '',
  ]
  const cols = 'Muscle Group,Exercise,PR Weight (kg),Reps,e1RM,Date'
  const sorted = [...prRows].sort((a, b) => a.muscleGroup.localeCompare(b.muscleGroup))
  const lines = sorted.map(
    (r) => `${r.muscleGroup},${r.exerciseName},${r.weightKg},${r.reps},${r.e1rm},${r.date}`
  )
  return [...header, cols, ...lines].join('\n')
}
