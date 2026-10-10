const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const sharp = require('sharp');
initializeApp();
const db = getFirestore();
const resendApiKey = defineSecret('RESEND_API_KEY');

function summarySvg(quiz, rows) {
  const escaped = (value) => String(value || '').replace(/[<&>]/g, c => ({'<':'&lt;','&':'&amp;','>':'&gt;'}[c]));
  const average = rows.length ? Math.round(rows.reduce((sum, r) => sum + (r.percentage || 0), 0) / rows.length) : 0;
  const people = rows.slice(0, 12).map((r, i) => `<text x="90" y="${210 + i * 30}" font-family="Arial" font-size="18" fill="#101b36">${i + 1}. ${escaped(r.friendName)} — ${r.percentage}%</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#fffdf8"/><rect width="1200" height="150" fill="#101b36"/><text x="70" y="92" font-family="Arial" font-size="40" font-weight="bold" fill="#f4b942">صاحبي عارفني؟ / تقرير الاختبار</text><text x="70" y="195" font-family="Arial" font-size="24" font-weight="bold" fill="#101b36">${escaped(quiz.title)}</text><text x="850" y="195" font-family="Arial" font-size="24" fill="#ff806d">المتوسط: ${average}%</text>${people || '<text x="90" y="250" font-family="Arial" font-size="22" fill="#68728a">لا توجد إجابات حتى الآن</text>'}<text x="70" y="740" font-family="Arial" font-size="18" fill="#68728a">تقرير آلي بعد 24 ساعة — نتائج الطلاب وأسمائهم</text></svg>`;
}

exports.submitQuiz = onCall({ region: 'us-central1', enforceAppCheck: true }, async (request) => {
  const { quizId, friendName, answers, deviceKey } = request.data || {};
  if (!quizId || !friendName || !answers || typeof answers !== 'object' || !deviceKey) throw new HttpsError('invalid-argument', 'Missing quiz submission fields.');
  const quizSnap = await db.doc(`quizzes/${quizId}`).get();
  const privateSnap = await db.doc(`quizPrivate/${quizId}`).get();
  if (!quizSnap.exists || !privateSnap.exists || quizSnap.data().active === false) throw new HttpsError('not-found', 'Quiz not found or closed.');
  const quiz = quizSnap.data(); const privateQuiz = privateSnap.data();
  const duplicate = await db.collection('submissions').where('quizId', '==', quizId).where('deviceKey', '==', deviceKey).limit(1).get();
  if (!duplicate.empty) throw new HttpsError('already-exists', 'This device already submitted this quiz.');
  const detail = (quiz.questions || []).map((question) => {
    const friend = String(answers[question.id] || '').trim();
    const creator = String((privateQuiz.answers || {})[question.id] || '').trim();
    const match = Boolean(friend && creator && friend.toLocaleLowerCase() === creator.toLocaleLowerCase());
    return { question: question.q, friend, creator: creator || 'إجابة شخصية', match, auto: question.type !== 'short' };
  });
  const score = detail.filter(item => item.match).length;
  const total = detail.length;
  const percentage = total ? Math.round(score / total * 100) : 0;
  const submission = { quizId, ownerUid: privateQuiz.ownerUid, deviceKey, friendName: String(friendName).slice(0, 80), score, total, percentage, detail, createdAt: FieldValue.serverTimestamp() };
  const submissionRef = await db.collection('submissions').add(submission);
  await db.doc(`leaderboards/${quizId}/entries/${submissionRef.id}`).set({ friendName: submission.friendName, score, total, percentage, createdAt: FieldValue.serverTimestamp() });
  await db.doc(`publicResults/${submissionRef.id}`).set({ quizId, creatorName: quiz.creatorName, title: quiz.title, friendName: submission.friendName, score, total, percentage, detail: detail.map(({ question, friend, match, auto }) => ({ question, friend, match, auto })), createdAt: FieldValue.serverTimestamp() });
  if ((privateQuiz.mode || quiz.mode) === 'teacher' && privateQuiz.teacherEmail) {
    await db.collection('reportJobs').add({ quizId, ownerUid: privateQuiz.ownerUid, email: privateQuiz.teacherEmail, dueAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), status: 'pending', createdAt: FieldValue.serverTimestamp() });
  }
  return { submissionId: submissionRef.id, score, total, percentage, detail };
});

exports.sendTeacherReports = onSchedule({ schedule: 'every 15 minutes', timeZone: 'Africa/Cairo', region: 'us-central1', secrets: [resendApiKey] }, async () => {
  const jobs = await db.collection('reportJobs').where('status', '==', 'pending').where('dueAt', '<=', Timestamp.now()).limit(20).get();
  for (const jobDoc of jobs.docs) {
    const job = jobDoc.data();
    try {
      const quizSnap = await db.doc(`quizzes/${job.quizId}`).get();
      const submissions = await db.collection('submissions').where('quizId', '==', job.quizId).orderBy('createdAt', 'asc').get();
      const rows = submissions.docs.map(d => d.data());
      const png = await sharp(Buffer.from(summarySvg(quizSnap.data() || {}, rows))).png().toBuffer();
      const apiKey = resendApiKey.value();
      if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.REPORT_FROM_EMAIL || 'reports@your-domain.com', to: [job.email], subject: `تقرير اختبار ${quizSnap.data()?.title || ''}`, html: '<p>مرفق تقرير نتائج الاختبار بعد 24 ساعة.</p>', attachments: [{ filename: 'quiz-report.png', content: png.toString('base64') }] }) });
      if (!response.ok) throw new Error(`Resend ${response.status}`);
      await jobDoc.ref.update({ status: 'sent', sentAt: FieldValue.serverTimestamp() });
    } catch (error) { await jobDoc.ref.update({ status: 'error', lastError: String(error.message), attempts: FieldValue.increment(1) }); }
  }
});
