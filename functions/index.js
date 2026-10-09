const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp();
const db = getFirestore();

exports.submitQuiz = onCall({ region: 'us-central1', enforceAppCheck: false }, async (request) => {
  const { quizId, friendName, answers } = request.data || {};
  if (!quizId || !friendName || !answers || typeof answers !== 'object') throw new HttpsError('invalid-argument', 'Missing quiz submission fields.');
  const quizSnap = await db.doc(`quizzes/${quizId}`).get();
  const privateSnap = await db.doc(`quizPrivate/${quizId}`).get();
  if (!quizSnap.exists || !privateSnap.exists || quizSnap.data().active === false) throw new HttpsError('not-found', 'Quiz not found or closed.');
  const quiz = quizSnap.data(); const privateQuiz = privateSnap.data();
  const detail = (quiz.questions || []).map((question) => {
    const friend = String(answers[question.id] || '').trim();
    const creator = String((privateQuiz.answers || {})[question.id] || '').trim();
    const match = Boolean(friend && creator && friend.toLocaleLowerCase() === creator.toLocaleLowerCase());
    return { question: question.q, friend, creator: creator || 'إجابة شخصية', match, auto: question.type !== 'short' };
  });
  const score = detail.filter(item => item.match).length;
  const total = detail.length;
  const submission = { quizId, ownerUid: privateQuiz.ownerUid, friendName: String(friendName).slice(0, 80), score, total, percentage: total ? Math.round(score / total * 100) : 0, detail, createdAt: FieldValue.serverTimestamp() };
  const submissionRef = await db.collection('submissions').add(submission);
  await db.doc(`leaderboards/${quizId}/entries/${submissionRef.id}`).set({ friendName: submission.friendName, score, total, percentage: submission.percentage, createdAt: FieldValue.serverTimestamp() });
  return { submissionId: submissionRef.id, score, total, percentage: submission.percentage, detail };
});
