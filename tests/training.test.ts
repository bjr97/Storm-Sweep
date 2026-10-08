import assert from 'node:assert/strict'
import { test } from 'node:test'

import { allModulesRead, gradeQuiz, parseProgress, QUIZ_QUESTIONS, TRAINING_MODULES } from '@/lib/sweepers/training'

test('quiz: right answers pass, any wrong or missing answer fails', () => {
  const right = [2, 1, 1, 1, 1]
  assert.equal(QUIZ_QUESTIONS.length, right.length)
  assert.deepEqual(gradeQuiz(right), { passed: true, wrong: [] })
  const oneWrong = gradeQuiz([0, 1, 1, 1, 1])
  assert.equal(oneWrong.passed, false)
  assert.deepEqual(oneWrong.wrong, ['photos'])
  assert.equal(gradeQuiz(right.slice(0, 4)).passed, false)
})

test('quiz questions sent to the browser carry no answers', () => {
  for (const q of QUIZ_QUESTIONS) assert.equal('answer' in q, false)
})

test('progress: ignores junk and unknown modules; all read only when every module is', () => {
  assert.deepEqual(parseProgress(null).read, [])
  assert.deepEqual(parseProgress({ read: ['jobs', 'bogus', 5] }).read, ['jobs'])
  assert.equal(allModulesRead({ read: ['jobs'] }), false)
  assert.equal(allModulesRead({ read: TRAINING_MODULES.map((m) => m.id) }), true)
})
