import type { City } from '../lib/cities'
import type { Difficulty } from '../lib/scoring'
import MultipleChoice from './MultipleChoice'
import AutocompleteInput from './AutocompleteInput'

export default function GuessInput({
  city,
  difficulty,
  pool,
  onGuess,
}: {
  city: City
  difficulty: Difficulty
  /** Pool to draw multiple-choice distractors from (defaults to all cities). */
  pool?: City[]
  onGuess: (label: string, correct: boolean) => void
}) {
  return difficulty === 'easy' ? (
    <MultipleChoice city={city} pool={pool} onGuess={onGuess} />
  ) : (
    <AutocompleteInput city={city} onGuess={onGuess} />
  )
}
